import { claude } from './claude.js';
import { codex } from './codex.js';
const CAPABILITIES = ['bounded', 'analytical', 'frontier'];
const START_EFFORTS = ['low', 'medium', 'high', 'xhigh'];
const bare = (model) => model.slice(model.lastIndexOf('/') + 1);
const prefixOf = (model) => model.slice(0, Math.max(0, model.lastIndexOf('/')));
const KEYS = new Set(['id', 'label', 'modelPrefixes', 'effortStarts', 'childModels']);
const overlaps = (a, b) => a.startsWith(b) || b.startsWith(a);
/** Validates the whole list up front; any conflict throws and no partial registry exists. */
export function createRegistry(input) {
    const strategies = input.map(s => structuredClone(s));
    const ids = new Set();
    const starts = new Map();
    const prefixes = [];
    for (const s of strategies) {
        if (!s.id)
            throw new Error('Strategy is missing an id');
        for (const key of Object.keys(s))
            if (!KEYS.has(key))
                throw new Error(`Strategy ${s.id} has an unknown key: ${key}`);
        if (ids.has(s.id))
            throw new Error(`Duplicate strategy id: ${s.id}`);
        ids.add(s.id);
        for (const prefix of s.modelPrefixes) {
            const lower = prefix.toLowerCase();
            if (!lower)
                throw new Error(`Strategy ${s.id} has an empty model prefix`);
            const clash = prefixes.find(p => overlaps(p.prefix.toLowerCase(), lower));
            if (clash)
                throw new Error(`Overlapping model prefixes: ${prefix} (${s.id}) and ${clash.prefix} (${clash.id})`);
            prefixes.push({ prefix, id: s.id });
        }
        for (const [model, effort] of Object.entries(s.effortStarts)) {
            if (!START_EFFORTS.includes(effort))
                throw new Error(`Strategy ${s.id} has an invalid starting effort: ${model}=${String(effort)}`);
            if (starts.has(model))
                throw new Error(`Duplicate starting effort key: ${model} (${starts.get(model)} and ${s.id})`);
            starts.set(model, s.id);
        }
        for (const capability of CAPABILITIES) {
            const slot = s.childModels?.[capability];
            if (typeof slot !== 'string' || !slot)
                throw new Error(`Strategy ${s.id} is missing a capability slot: ${capability}`);
            if (slot.includes('/'))
                throw new Error(`Strategy ${s.id} capability slot must not contain /: ${slot}`);
        }
    }
    const byId = new Map(strategies.map(s => [s.id, s]));
    return Object.freeze({
        strategies,
        familyOfMainModel: (model) => {
            if (typeof model !== 'string' || !model)
                return undefined;
            const name = bare(model).toLowerCase();
            return strategies.find(s => s.modelPrefixes.some(p => name.startsWith(p.toLowerCase())));
        },
        resolveSlot: (familyId, capability, parentModel, models) => {
            const slot = byId.get(familyId)?.childModels[capability]?.toLowerCase();
            if (!slot)
                return undefined;
            const hits = models.filter(m => bare(m).toLowerCase() === slot && prefixOf(m) === prefixOf(parentModel));
            return hits.length === 1 ? hits[0] : undefined;
        },
        effortStart: (model) => {
            const name = bare(model);
            for (const s of strategies)
                if (Object.hasOwn(s.effortStarts, name))
                    return s.effortStarts[name];
            return undefined;
        },
        get: (familyId) => byId.get(familyId),
        ids: () => strategies.map(s => s.id),
        labels: () => strategies.map(s => s.label),
    });
}
export const BUILTIN_STRATEGIES = [claude, codex];
/** The registry every module uses unless a test injects strategies through `apply(ctx, { strategies })`. */
export const registry = createRegistry(BUILTIN_STRATEGIES);
