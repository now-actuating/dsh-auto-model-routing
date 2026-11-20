import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-api-session-controller'
import type {} from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-tools'
import { resolve } from 'node:path'
import { SettingsStore } from './settings.js'
import { settingsHost } from './settings-host.js'
import { homedir } from 'node:os'
import { FileStateStore, RoutingState } from './state.js'
import { endpoint, type AgentRef } from './endpoints.js'
import { JevClient } from './jev.js'
import { routeSubagentTool } from './subagent-tool.js'
import { policyHost } from './policy-host.js'
import { PolicyStore } from './policy-store.js'
import { currentMainSelection, mainSupported } from './support.js'
import { createRegistry, registry as builtin, type FamilyStrategy } from './strategies/index.js'

const SCOPE_NOTE = 'Binding uses the official tool ALS context, the same parent, and startup. Plugin-created siblings in the same window cannot be distinguished and may also be managed.'
export const name = 'dsh-auto-model-routing'
/** Child decision records. The historical directory name is kept on purpose: records are not migrated. */
export const CHILD_DECISIONS_DIR = 'state/auto-model-routing/policy-v2'
export const inject = ['llm', 'agents', 'tools']

/** Test seams only; production uses the defaults. */
export interface Config { home?: string; jevBase?: string; jevTimeoutMs?: number; strategies?: readonly FamilyStrategy[] }

export function apply(ctx: Context, config: Config = {}): void {
  const home = config.home ?? process.env.DSH_HOME ?? resolve(homedir(), '.dsh')
  const registry = config.strategies ? createRegistry(config.strategies) : builtin
  const settings = new SettingsStore(resolve(home, 'plugins/dsh-auto-model-routing/config.json'))
  const hostSettings = settingsHost(ctx, settings)
  const jev = new JevClient({ get: hostSettings.credential }, config.jevBase, config.jevTimeoutMs ?? (() => settings.read().settings.jevTimeoutMs), config.jevBase ? undefined : () => settings.read().settings.decisionService)
  const stateFiles = new FileStateStore(resolve(home, 'state/auto-model-routing/sessions'))
  const state = new RoutingState(stateFiles)
  // The former allocation-feedback.jsonl ledger (main-session ratings) is left on disk as is: neither read nor removed.
  const policy = policyHost(ctx, { jev, state, store: new PolicyStore(resolve(home, CHILD_DECISIONS_DIR), registry), settings: () => settings.read().settings, catalog: provider => hostSettings.catalog(provider), registry })
  const toastOn = (): boolean => settings.read().settings.decisionToast
  ctx.effect(() => ctx.tools.register(routeSubagentTool(jev, { agents: ctx.agents as never, state, readSettings: () => settings.read().settings, catalog: hostSettings.catalog, registry })))
  ctx.on('agent/created', ({ agent, source }) => {
    // Factory resume announces `resume`; a nonzero initial seed also excludes restored/forked histories.
    if (source !== 'startup' || agent.session.header.origin === 'subagent' || agent.session.firstLiveSeq !== 0 || agent.session.header.isSeeded || agent.session.snapshotEvents().some(event => event.type === 'session/end-seed') || stateFiles.get(agent.id)) return
    if (settings.read().settings.defaultMode !== 'AUTO') return
    // A new session whose default main model is outside AUTO's registered families starts in MANUAL.
    if (!mainSupported(currentMainSelection(ctx, agent), registry)) return
    state.setMode(agent.id, 'AUTO')
    return undefined
  })
  // Agent is the WeakMap identity; origin stays on the immutable session header.
  const refs = new WeakMap<object, AgentRef>()
  const ref = (agent: { id: string; session: { header: { origin?: string } } }): AgentRef => {
    let value = refs.get(agent)
    if (!value) { value = { id: agent.id, ...(agent.session.header.origin ? { origin: agent.session.header.origin } : {}) }; refs.set(agent, value) }
    return value
  }

  ctx.inject(['connection', 'sessionController'], child => {
    const modeRequest = async (operation: 'state' | 'setMode', payload: unknown): Promise<Response> => {
      const resolveAgent = async (id: string) => {
        const result = await child.sessionController.resolveAgent(id as never)
        return 'agent' in result ? ref(result.agent) : undefined
      }
      // Child sessions have no AUTO chip: answer before any support check, lock or decoration.
      if (operation === 'state' && typeof (payload as { sessionId?: unknown })?.sessionId === 'string') {
        const target = await resolveAgent((payload as { sessionId: string }).sessionId)
        if (target?.origin === 'subagent') return Response.json({ applicable: false })
      }
      if (operation === 'setMode' && typeof (payload as { sessionId?: unknown })?.sessionId === 'string') {
        const id = (payload as { sessionId: string }).sessionId, mode = (payload as { mode?: unknown }).mode
        if ((mode === 'AUTO' || mode === 'MANUAL') && state.read(id).mode !== mode && await resolveAgent(id)) policy.invalidate(id)
      }
      const response = await endpoint(operation, payload, resolveAgent, state)
      if (!response.ok) return response
      const sessionId = (payload as { sessionId: string }).sessionId
      const resolved = await child.sessionController.resolveAgent(sessionId as never).catch(() => undefined)
      const selection = resolved && 'agent' in resolved ? currentMainSelection(ctx, resolved.agent) : undefined
      const supported = mainSupported(selection, registry)
      if (!supported && state.read(sessionId).mode === 'AUTO') { state.setMode(sessionId, 'MANUAL'); policy.invalidate(sessionId) }
      const { previous: _previous, ...persisted } = await response.json()
      return Response.json({ ...persisted, mode: state.read(sessionId).mode, ...(policy.latestDecision(sessionId) ? { decision: policy.latestDecision(sessionId) } : {}), ...(policy.childNotice(sessionId) ? { childNotice: policy.childNotice(sessionId) } : {}), ...(toastOn() ? { decisionToast: true } : {}), autoSupport: { supported, ...(selection ? { provider: selection.provider, model: selection.model } : {}) } })
    }
    child.provide('autoModelRouting' as never, { call: async (operation: 'state' | 'setMode', payload: unknown) => {
      if (operation !== 'state' && operation !== 'setMode') throw new Error('Unsupported routing operation')
      const response = await modeRequest(operation, payload)
      if (!response.ok) throw new Error('Routing mode request rejected')
      return response.json()
    } } as never)
    for (const operation of ['state', 'setMode', 'settings', 'saveSettings', 'setKey', 'testDecision', 'decisionModels', 'childRouting'] as const) {
      child.effect(() => child.connection.fetch.register({
        path: `/api/auto-model-routing.${operation}`,
        methods: ['POST'], requestBody: 'buffered',
        fetch: async (request) => {
          let body: unknown
          try { body = await request.json() } catch { return Response.json({ error: 'invalid JSON' }, { status: 400 }) }
          const wire = body as { type?: unknown; rpcId?: unknown; method?: unknown; payload?: unknown } | null
          const enveloped = wire?.type === 'client-request'
          if (enveloped && (typeof wire.rpcId !== 'string' || wire.method !== `auto-model-routing.${operation}`)) return Response.json({ error: 'invalid RPC envelope' }, { status: 400 })
          const payload = enveloped ? wire.payload : body
          const response = operation === 'childRouting'
            ? (typeof (payload as { sessionId?: unknown })?.sessionId === 'string'
              ? Response.json((record => record ? { ...record, scopeNote: SCOPE_NOTE } : { status: 'unsupported', reason: 'No bound subtask decision' })(policy.status((payload as { sessionId: string }).sessionId)))
              : Response.json({ error: 'invalid request' }, { status: 400 }))
            : operation === 'settings' || operation === 'saveSettings' || operation === 'setKey' || operation === 'testDecision' || operation === 'decisionModels'
            ? await hostSettings.endpoint(operation, payload)
            : await modeRequest(operation, payload)
          if (!enveloped) return response
          const value = await response.json()
          return Response.json({ type: 'server-response', rpcId: wire.rpcId, result: response.ok ? { ok: true, value } : { ok: false, error: { code: 'invalid-request', message: value.error, details: { issues: value.issues ?? [] } } } })
        },
      }))
    }
  })
}
