// Browser-safe: imported by the client bundle. Pure data plus lookups; no load-time validation
// (a metadata typo must never take down the settings page). Constraints are enforced by tests.
import reasoningDepth from './reasoning-depth/rubric.json' with { type: 'json' };
import effortAsVerification from './effort-as-verification/rubric.json' with { type: 'json' };
/** First entry is the default. Published judgement content never changes in place: add a new id instead. */
export const PRESETS = [
    {
        id: 'reasoning-depth',
        rubric: reasoningDepth,
        title: 'Reasoning depth',
        summary: 'Depth follows the reasoning investment the task needs: raise it only for unusually careful multi-step reasoning, hard constraints or subtle proofs; volume and risk alone do not.',
        evidence: 'A 10-case synthetic classification check against typesafe/jev-1.13 by this project (2026-10-24); it shows interface and classification consistency, not task quality or cost benefit.',
        sources: [{ title: 'AUTO synthetic Jev check (eval/)', url: 'https://github.com/prgrmrwy/dsh-auto-model-routing/blob/main/eval/README.md', date: '2026-10-24' }],
        context: [],
    },
    {
        id: 'effort-as-verification',
        rubric: effortAsVerification,
        title: 'Effort as verification',
        summary: 'Depth follows how much verification, edge-case testing and independent judgement the next work needs, not reasoning difficulty: raise it when hidden edge cases must be found by reproducing, comparing or fuzzing; lower it for quick first passes someone will review. Extra effort does not fix a wrong approach; that is a capability matter.',
        evidence: "Based on Anthropic's internal Terminal-Bench 3.0 runs for Opus 5.5 / Fable 5.1 (5 attempts per task); this project has no live judgement evidence yet. Applying it to the GPT family is an unverified extrapolation.",
        sources: [{ title: 'Using Claude Code: Spending your effort', url: 'https://claude.dev/blog/spending-your-effort/', date: '2026-09-25' }],
        context: ['execution'],
    },
];
export const DEFAULT_PRESET_ID = PRESETS[0].id;
const LABELS = { capability: ['analytical', 'bounded', 'frontier', 'insufficient_context'], depth: ['baseline', 'higher', 'lower'] };
const CONTEXTS = ['execution'];
const filled = (v) => typeof v === 'string' && v.trim().length > 0;
/** Structural constraints of a preset list. Called by tests only; the runtime never throws on metadata. */
export function presetIssues(list) {
    const issues = [];
    const seen = new Set();
    for (const p of list) {
        const bad = (field, message) => issues.push(`${p.id}: ${field} ${message}`);
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id))
            bad('id', 'must be lower kebab-case');
        if (seen.has(p.id))
            bad('id', 'is duplicated');
        seen.add(p.id);
        const rubric = p.rubric;
        if (Object.keys(rubric).sort().join() !== 'capability,depth')
            bad('rubric', 'must hold exactly capability and depth');
        for (const dimension of ['capability', 'depth']) {
            const q = rubric[dimension];
            if (!q)
                continue;
            if (q.type !== 'choice')
                bad(dimension, 'type must be choice');
            if (!filled(q.instructions))
                bad(dimension, 'instructions must be non-empty');
            const keys = Object.keys(q.criteria ?? {}).sort();
            if (keys.join() !== LABELS[dimension].join())
                bad(dimension, `criteria keys must be ${LABELS[dimension].join('/')}`);
            for (const [label, text] of Object.entries(q.criteria ?? {}))
                if (!filled(text))
                    bad(`${dimension}.${label}`, 'criterion must be non-empty');
        }
        for (const c of p.context)
            if (!CONTEXTS.includes(c))
                bad('context', `has unknown value ${String(c)}`);
        for (const key of ['title', 'summary', 'evidence'])
            if (!filled(p[key]))
                bad(key, 'must be non-empty');
        if (!p.sources.length)
            bad('sources', 'must not be empty');
        for (const s of p.sources) {
            if (!s.url.startsWith('https://'))
                bad('sources', `url must be https: ${s.url}`);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date))
                bad('sources', `date must be YYYY-MM-DD: ${s.date}`);
        }
    }
    return issues;
}
/** Unknown or missing ids resolve to the default preset. */
export function resolvePreset(id) {
    return PRESETS.find(p => p.id === id) ?? PRESETS[0];
}
