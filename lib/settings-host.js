import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment';
import { DEFAULT_SETTINGS, SettingsValidationError } from './settings.js';
import { JevClient } from './jev.js';
import { DECISION_SERVICES } from './decision-service.js';
import { resolvePreset } from './presets/index.js';
import { decisionModelCatalog } from './decision-models.js';
const keyRef = (provider = 'openrouter') => credentialRef(DECISION_SERVICES[provider].credential);
/** Only the fixed credential reference and public catalog metadata cross this adapter. */
export function settingsHost(ctx, store, decisionModels = decisionModelCatalog()) {
    const environment = launchEnvironmentOf(ctx);
    const credentials = () => ctx.get('credentials');
    const allowlist = () => {
        // The optional provider is owned by dsh-tool-subagent, not this package.
        const service = ctx.get('subagentModelSelection');
        try {
            if (service) {
                const current = service.current();
                return { status: current.enabled ? 'enabled' : 'disabled', allowedModels: current.allowedModels };
            }
        }
        catch { /* An unavailable policy must never broaden the allowed routes. */ }
        return { status: 'unavailable', allowedModels: [] };
    };
    /** One provider when routing; otherwise only the providers the allowlist names (never every host provider). */
    const catalog = async (only) => {
        const childAllowlist = allowlist();
        const wanted = new Set(only ? [only] : childAllowlist.allowedModels.map(r => r.provider));
        const models = (await Promise.all(ctx.llm.listProviders().filter(p => wanted.has(p.id)).map(async (provider) => {
            try {
                return await Promise.all((await ctx.llm.listModels(provider.id)).map(async (model) => {
                    try {
                        const info = await ctx.llm.resolveModelInfo(provider.id, model.id);
                        return { provider: provider.id, model: model.id, name: model.name, reasoningEfforts: (info.reasoning?.efforts ?? []).map(e => String(e.id)), ...(info.reasoning?.defaultEffort ? { defaultEffort: String(info.reasoning.defaultEffort) } : {}) };
                    }
                    catch {
                        return undefined;
                    }
                })).then(entries => entries.filter((entry) => entry !== undefined));
            }
            catch {
                return [];
            }
        }))).flat();
        return { models, childAllowlist };
    };
    const keyStatus = async (provider = store.read().settings.decisionService?.provider ?? 'openrouter') => {
        const ref = keyRef(provider);
        const service = credentials();
        if (service) {
            try {
                return { ...await service.describe(ref), available: true };
            }
            catch {
                return { configured: false, writable: false, available: false };
            }
        }
        return { configured: Boolean(environment.get(ref)?.value), writable: false, available: false };
    };
    const read = async () => {
        const current = await catalog();
        const result = store.read();
        return { settings: result.settings, defaults: DEFAULT_SETTINGS, configStatus: result.status, issues: result.issues, deprecated: result.deprecated, key: await keyStatus(), ...current };
    };
    const endpoint = async (operation, body) => {
        if (operation === 'settings')
            return Response.json(await read());
        if (operation === 'decisionModels') {
            if (body !== undefined && body !== null && (typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => k !== 'refresh') || ('refresh' in body && typeof body.refresh !== 'boolean')))
                return Response.json({ error: 'Invalid model list request' }, { status: 400 });
            return Response.json(await decisionModels(Boolean(body?.refresh)));
        }
        if (operation === 'testDecision') {
            const client = new JevClient({ get: async (name) => credentials() ? credentials().resolve(credentialRef(name)) : environment.get(name) }, undefined, 8000, () => store.read().settings.decisionService);
            const preset = resolvePreset(store.read().settings.preset);
            const result = await client.judgePolicy('Public connection test: sort the numbers [3,1,2] in ascending order.', new AbortController().signal, 'child', 'both', preset);
            return Response.json(result);
        }
        if (operation === 'saveSettings') {
            try {
                store.save(body);
                return Response.json(await read());
            }
            catch (error) {
                if (error instanceof SettingsValidationError)
                    return Response.json({ error: error.message, issues: error.issues }, { status: 400 });
                return Response.json({ error: 'Could not save auto model routing settings' }, { status: 500 });
            }
        }
        const service = credentials();
        if (!service)
            return Response.json({ error: 'The credential service is unavailable' }, { status: 503 });
        if (typeof body !== 'object' || body === null || Array.isArray(body) || Object.keys(body).some(k => !['value', 'provider'].includes(k)) || !('value' in body))
            return Response.json({ error: 'Invalid credential request' }, { status: 400 });
        const provider = 'provider' in body ? body.provider : 'openrouter';
        if (typeof provider !== 'string' || !Object.hasOwn(DECISION_SERVICES, provider))
            return Response.json({ error: 'Invalid service provider' }, { status: 400 });
        const ref = keyRef(provider);
        const value = body.value;
        if (value !== null && (typeof value !== 'string' || !value || value.length > 512 || /\s/.test(value)))
            return Response.json({ error: 'The API key must be non-empty, contain no whitespace, and be at most 512 characters' }, { status: 400 });
        try {
            if (!(await service.describe(ref)).writable)
                return Response.json({ error: 'This key comes from the launch environment. Remove it from that environment and restart before managing it here' }, { status: 409 });
            if (value === null)
                await service.unset(ref);
            else
                await service.set(ref, value);
            return Response.json({ key: await keyStatus(provider) });
        }
        catch {
            return Response.json({ error: 'Could not update the API key; check the credential service and any read-only sources' }, { status: 500 });
        }
    };
    return {
        catalog, read, endpoint,
        credential: async (name) => {
            const service = credentials();
            return service ? service.resolve(credentialRef(name)) : environment.get(name);
        },
    };
}
