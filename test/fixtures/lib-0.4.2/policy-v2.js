import { targetEffort } from './effort.js';
import { AUTO_EFFORTS } from './settings-contract.js';
import { MODEL_ID_PATTERN } from './settings-validation.js';
export const POLICY_PROVIDERS = ['claude', 'codex', 'dsh-magpie-connect', 'dsh-magpie-connector'];
export function magpieProvider(value) { return value === 'dsh-magpie-connect' || value === 'dsh-magpie-connector'; }
export function policyProvider(value) { return POLICY_PROVIDERS.some(provider => provider === value); }
export function modelFamily(provider, model) {
    if (provider === 'claude' || provider === 'codex')
        return provider;
    if (!magpieProvider(provider))
        return undefined;
    const family = model.split('/')[0];
    return family === 'claude' || family === 'codex' ? family : undefined;
}
export function validatePolicyRoute(catalog, provider, model, effort, cap) {
    const entry = catalog.models.find(m => m.provider === provider && m.model === model);
    const validId = magpieProvider(provider) ? /^[A-Za-z0-9._:-]+(?:\/[A-Za-z0-9._:-]+)+$/.test(model) && model.length <= 128 : MODEL_ID_PATTERN.test(model);
    if (!policyProvider(provider) || !validId || !entry || !AUTO_EFFORTS.includes(effort) || AUTO_EFFORTS.indexOf(effort) > AUTO_EFFORTS.indexOf(cap) || !entry.reasoningEfforts.includes(effort) || catalog.childAllowlist.status !== 'enabled' || !catalog.childAllowlist.allowedModels.some(m => m.provider === provider && m.model === model))
        throw new Error('The policy route violates the current catalog, allowlist, or effort cap; pause delegation and ask the user');
}
// Versioned initial slots; Codex currently has only two approved capability models.
export const POLICY_MODELS = {
    claude: { bounded: 'claude-haiku-5-5', analytical: 'claude-sonnet-5-5', frontier: 'claude-opus-5-5' },
    codex: { bounded: 'gpt-6-luna', analytical: 'gpt-6.1-sol', frontier: 'gpt-6.1-sol' },
};
export const mappingVersion = 'capability-slots-2-magpie';
export function policyEffort(model, depth, supported, cap, defaultEffort) {
    const bare = model.includes('/') ? model.slice(model.lastIndexOf('/') + 1) : model;
    const known = /^(claude-(haiku|sonnet|opus)-5-5|claude-fable-5-1|gpt-6-luna|gpt-6\.1-sol|gpt-6-astra)$/.test(bare);
    const start = known ? targetEffort(bare, 'standard') : defaultEffort;
    if (!start)
        throw new Error('unsupported: the model has no verifiable default effort');
    const baseline = AUTO_EFFORTS.indexOf(start);
    if (baseline < 0 || !supported.includes(start))
        throw new Error('Cannot verify the recommended starting effort; configure a supported model first');
    const candidates = AUTO_EFFORTS.filter(e => supported.includes(e));
    const index = candidates.indexOf(start);
    const offset = depth === 'lower' ? -1 : depth === 'higher' ? 1 : 0;
    const chosen = candidates[Math.max(0, Math.min(candidates.length - 1, index + offset))];
    const allowed = candidates.filter(e => AUTO_EFFORTS.indexOf(e) <= AUTO_EFFORTS.indexOf(cap));
    if (!allowed.length)
        throw new Error('No supported effort within the cap');
    return AUTO_EFFORTS.indexOf(chosen) > AUTO_EFFORTS.indexOf(cap) ? allowed.at(-1) : chosen;
}
export function choosePolicyRoute(provider, capability, depth, catalog, cap, explicit = {}, family) {
    const selectedFamily = magpieProvider(provider) ? family : provider;
    if (!explicit.model && !selectedFamily)
        throw new Error('unsupported: no model capability family is defined; specify a model explicitly');
    const model = explicit.model ?? `${magpieProvider(provider) ? `${selectedFamily}/` : ''}${POLICY_MODELS[selectedFamily][capability]}`;
    const entry = catalog.models.find(m => m.provider === provider && m.model === model);
    const reasoningEffort = explicit.reasoningEffort ?? policyEffort(model, depth, entry?.reasoningEfforts ?? [], cap, entry?.defaultEffort);
    validatePolicyRoute(catalog, provider, model, reasoningEffort, cap);
    return { provider, model, reasoningEffort: reasoningEffort };
}
