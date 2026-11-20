import { resolve } from 'node:path';
import { SettingsStore } from './settings.js';
import { settingsHost } from './settings-host.js';
import { homedir } from 'node:os';
import { FileStateStore, RoutingState } from './state.js';
import { endpoint, labelEndpoint, observeEndpoint } from './endpoints.js';
import { FeedbackBook } from './feedback.js';
import { JevClient } from './jev.js';
import { routeSubagentTool } from './subagent-tool.js';
import { policyHost } from './policy-host.js';
import { PolicyStore } from './policy-store.js';
import { currentMainSelection, mainSupported } from './support.js';
import { createRegistry, registry as builtin } from './strategies/index.js';
const SCOPE_NOTE = '按官方工具 ALS 上下文、同父与 startup 绑定；不能区分同窗口插件旁支，旁支可能一并受管。';
export const name = 'dsh-auto-model-routing';
/** Child decision records. The historical directory name is kept on purpose: records are not migrated. */
export const CHILD_DECISIONS_DIR = 'state/auto-model-routing/policy-v2';
export const inject = ['llm', 'agents', 'tools'];
export function apply(ctx, config = {}) {
    const home = config.home ?? process.env.DSH_HOME ?? resolve(homedir(), '.dsh');
    const registry = config.strategies ? createRegistry(config.strategies) : builtin;
    const settings = new SettingsStore(resolve(home, 'plugins/dsh-auto-model-routing/config.json'));
    const hostSettings = settingsHost(ctx, settings);
    const jev = new JevClient({ get: hostSettings.credential }, config.jevBase, config.jevTimeoutMs ?? (() => settings.read().settings.jevTimeoutMs), config.jevBase ? undefined : () => settings.read().settings.decisionService);
    const stateFiles = new FileStateStore(resolve(home, 'state/auto-model-routing/sessions'));
    const state = new RoutingState(stateFiles);
    const feedback = new FeedbackBook(resolve(home, 'state/auto-model-routing/allocation-feedback.jsonl'));
    // Official writer is available only while the session controller is mounted.
    let selectModel;
    const policy = policyHost(ctx, { feedback, jev, state, selectModel: async (request) => { if (!selectModel)
            throw new Error('session controller is unavailable'); await selectModel(request); }, store: new PolicyStore(resolve(home, CHILD_DECISIONS_DIR), registry), settings: () => settings.read().settings, catalog: provider => hostSettings.catalog(provider), registry });
    const toastOn = () => settings.read().settings.decisionToast;
    ctx.effect(() => ctx.tools.register(routeSubagentTool(jev, { agents: ctx.agents, state, readSettings: () => settings.read().settings, catalog: hostSettings.catalog, registry })));
    ctx.on('agent/created', ({ agent, source }) => {
        // Factory resume announces `resume`; a nonzero initial seed also excludes restored/forked histories.
        if (source !== 'startup' || agent.session.header.origin === 'subagent' || agent.session.firstLiveSeq !== 0 || agent.session.header.isSeeded || agent.session.snapshotEvents().some(event => event.type === 'session/end-seed') || stateFiles.get(agent.id))
            return;
        if (settings.read().settings.defaultMode !== 'AUTO')
            return;
        // A new session whose default main model is outside AUTO's registered families starts in MANUAL.
        if (!mainSupported(currentMainSelection(ctx, agent), registry))
            return;
        state.setMode(agent.id, 'AUTO');
        return undefined;
    });
    // Agent is the WeakMap identity; origin stays on the immutable session header.
    const refs = new WeakMap();
    const ref = (agent) => {
        let value = refs.get(agent);
        if (!value) {
            value = { id: agent.id, ...(agent.session.header.origin ? { origin: agent.session.header.origin } : {}) };
            refs.set(agent, value);
        }
        return value;
    };
    ctx.inject(['sessionController'], child => {
        selectModel = request => child.sessionController.selectModel(request);
        child.effect(() => () => { selectModel = undefined; });
    });
    ctx.inject(['connection', 'sessionController'], child => {
        const modeRequest = async (operation, payload) => {
            const resolveAgent = async (id) => {
                const result = await child.sessionController.resolveAgent(id);
                return 'agent' in result ? ref(result.agent) : undefined;
            };
            // Child sessions have no AUTO chip: answer before any support check, lock or decoration.
            if (operation === 'state' && typeof payload?.sessionId === 'string') {
                const target = await resolveAgent(payload.sessionId);
                if (target?.origin === 'subagent')
                    return Response.json({ applicable: false });
            }
            let manualDecision;
            if (operation === 'setMode' && typeof payload?.sessionId === 'string') {
                const id = payload.sessionId, mode = payload.mode;
                if ((mode === 'AUTO' || mode === 'MANUAL') && state.read(id).mode !== mode && await resolveAgent(id)) {
                    const decisionId = policy.appliedDecision(id);
                    if (mode === 'MANUAL' && decisionId !== undefined)
                        manualDecision = { sessionId: id, decisionId };
                    policy.invalidate(id);
                }
            }
            const response = await endpoint(operation, payload, resolveAgent, state);
            if (!response.ok)
                return response;
            if (manualDecision) {
                try {
                    feedback.fact(manualDecision.sessionId, manualDecision.decisionId, 'manual-switch');
                }
                catch {
                    ctx.logger.warn('auto-model-routing: could not record MANUAL switch');
                }
            }
            const sessionId = payload.sessionId;
            const resolved = await child.sessionController.resolveAgent(sessionId).catch(() => undefined);
            const selection = resolved && 'agent' in resolved ? currentMainSelection(ctx, resolved.agent) : undefined;
            const supported = mainSupported(selection, registry);
            if (!supported && state.read(sessionId).mode === 'AUTO') {
                state.setMode(sessionId, 'MANUAL');
                policy.invalidate(sessionId);
            }
            const { previous: _previous, ...persisted } = await response.json();
            return Response.json({ ...persisted, mode: state.read(sessionId).mode, ...policy.mainStatus(sessionId), ...(policy.childNotice(sessionId) ? { childNotice: policy.childNotice(sessionId) } : {}), ...(toastOn() ? { decisionToast: true } : {}), autoSupport: { supported, ...(selection ? { provider: selection.provider, model: selection.model } : {}) } });
        };
        child.provide('autoModelRouting', { call: async (operation, payload) => {
                if (operation !== 'state' && operation !== 'setMode')
                    throw new Error('Unsupported routing operation');
                const response = await modeRequest(operation, payload);
                if (!response.ok)
                    throw new Error('Routing mode request rejected');
                return response.json();
            } });
        for (const operation of ['state', 'setMode', 'label', 'observe', 'settings', 'saveSettings', 'setKey', 'testDecision', 'decisionModels', 'childRouting']) {
            child.effect(() => child.connection.fetch.register({
                path: `/api/auto-model-routing.${operation}`,
                methods: ['POST'], requestBody: 'buffered',
                fetch: async (request) => {
                    let body;
                    try {
                        body = await request.json();
                    }
                    catch {
                        return Response.json({ error: 'invalid JSON' }, { status: 400 });
                    }
                    const wire = body;
                    const enveloped = wire?.type === 'client-request';
                    if (enveloped && (typeof wire.rpcId !== 'string' || wire.method !== `auto-model-routing.${operation}`))
                        return Response.json({ error: 'invalid RPC envelope' }, { status: 400 });
                    const resolveAgent = async (id) => {
                        const result = await child.sessionController.resolveAgent(id);
                        return 'agent' in result ? ref(result.agent) : undefined;
                    };
                    const payload = enveloped ? wire.payload : body;
                    const response = operation === 'childRouting'
                        ? (typeof payload?.sessionId === 'string'
                            ? Response.json((record => record ? { ...record, scopeNote: SCOPE_NOTE } : { status: 'unsupported', reason: '没有已绑定的子任务决策' })(policy.status(payload.sessionId)))
                            : Response.json({ error: 'invalid request' }, { status: 400 }))
                        : operation === 'settings' || operation === 'saveSettings' || operation === 'setKey' || operation === 'testDecision' || operation === 'decisionModels'
                            ? await hostSettings.endpoint(operation, payload)
                            : operation === 'observe' ? await observeEndpoint(payload, resolveAgent, feedback, () => ctx.logger.warn('auto-model-routing: could not record exposure'))
                                : operation === 'label' ? await labelEndpoint(payload, resolveAgent, feedback) : await modeRequest(operation, payload);
                    if (!enveloped)
                        return response;
                    const value = await response.json();
                    return Response.json({ type: 'server-response', rpcId: wire.rpcId, result: response.ok ? { ok: true, value } : { ok: false, error: { code: 'invalid-request', message: value.error, details: { issues: value.issues ?? [] } } } });
                },
            }));
        }
    });
}
