import { resolveDecisionService } from './decision-service.js';
const probability = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
const distribution = (value) => Object.fromEntries(Object.entries(value ?? {}).filter(([, v]) => probability(v)));
export { CATEGORY_HINTS } from './hints.js';
const MAX_BODY = 64 * 1024;
function byStatus(status) {
    if (status === 402)
        return 'insufficient-credits';
    if (status === 401 || status === 403)
        return 'unauthorized';
    if (status === 429)
        return 'rate-limited';
    if (status === 451)
        return 'region-blocked';
    if (status >= 500)
        return 'unavailable';
    return 'rejected';
}
export class JevClient {
    env;
    timeoutMs;
    service;
    url;
    constructor(env, base = 'https://openrouter.ai', timeoutMs = 8000, service) {
        this.env = env;
        this.timeoutMs = timeoutMs;
        this.service = service;
        this.url = `${base}/api/alpha/decisions`;
    }
    /** One request, no retry. Never throws; never returns the body or the key. `state` comes from `buildState`. */
    async judgePolicy(state, signal, scope, dimensions, preset) {
        // The caller captured `preset` once for this judgement; questions and choice checks both use it.
        const policyQuestions = preset.rubric;
        const questions = scope === 'main' || dimensions === 'depth' ? { depth: policyQuestions.depth }
            : dimensions === 'capability' ? { capability: policyQuestions.capability } : policyQuestions;
        const result = await this.decide(state, signal, questions);
        if (result.kind !== 'ok')
            return result;
        const depth = result.answers?.depth?.choice;
        const capability = result.answers?.capability?.choice;
        if (Object.hasOwn(questions, 'depth') && (typeof depth !== 'string' || !Object.hasOwn(policyQuestions.depth.criteria, depth)))
            return { kind: 'failed', category: 'invalid-response' };
        if (Object.hasOwn(questions, 'capability') && (typeof capability !== 'string' || !Object.hasOwn(policyQuestions.capability.criteria, capability)))
            return { kind: 'failed', category: 'invalid-response' };
        return { kind: 'ok', depth: (Object.hasOwn(questions, 'depth') ? depth : 'baseline'), ...(Object.hasOwn(questions, 'capability') ? { capability: capability } : {}), ms: result.ms, decisionProvider: result.decisionProvider, decisionModel: result.decisionModel,
            ...(probability(result.answers.depth?.confidence) ? { confidence: result.answers.depth.confidence } : {}),
            ...(result.answers.depth?.probabilities ? { probabilities: distribution(result.answers.depth.probabilities) } : {}),
            ...(probability(result.answers.capability?.confidence) ? { capabilityConfidence: result.answers.capability.confidence } : {}),
            ...(result.answers.capability?.probabilities ? { capabilityProbabilities: distribution(result.answers.capability.probabilities) } : {}) };
    }
    async decide(state, signal, questions) {
        if (signal.aborted)
            return { kind: 'cancelled' };
        const configuredTimeout = typeof this.timeoutMs === 'function' ? this.timeoutMs() : this.timeoutMs;
        // Settings callbacks use the public range; numeric constructor overrides remain available to tests.
        const timeout = typeof this.timeoutMs === 'function' && (!Number.isInteger(configuredTimeout) || configuredTimeout < 1000 || configuredTimeout > 8000) ? 8000 : configuredTimeout;
        const deadline = AbortSignal.timeout(timeout);
        const started = performance.now();
        try {
            const service = resolveDecisionService(this.service?.());
            const abort = AbortSignal.any([signal, deadline]);
            let onAbort = () => { };
            const cancelled = new Promise((_, reject) => {
                onAbort = () => reject(new Error('aborted'));
                abort.addEventListener('abort', onAbort, { once: true });
            });
            let credential;
            try {
                credential = await Promise.race([Promise.resolve(this.env.get(service.credential)), cancelled]);
            }
            finally {
                abort.removeEventListener('abort', onAbort);
            }
            const key = credential?.value;
            if (signal.aborted)
                return { kind: 'cancelled' };
            if (deadline.aborted)
                return { kind: 'failed', category: 'timeout' };
            if (!key)
                return { kind: 'failed', category: 'missing-credential' };
            const response = await fetch(this.service ? service.endpoint : this.url, {
                method: 'POST',
                redirect: 'error',
                signal: AbortSignal.any([signal, deadline]),
                headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'ohmydsh auto-model-routing' },
                body: JSON.stringify({ model: service.model, state, questions }),
            });
            if (!response.ok) {
                await response.body?.cancel().catch(() => { });
                return { kind: 'failed', category: byStatus(response.status) };
            }
            if (!response.body)
                return { kind: 'failed', category: 'invalid-response' };
            const reader = response.body.getReader();
            const bytes = new Uint8Array(MAX_BODY);
            let size = 0;
            try {
                while (true) {
                    const chunk = await reader.read();
                    if (chunk.done)
                        break;
                    if (size + chunk.value.byteLength > MAX_BODY) {
                        await reader.cancel().catch(() => { });
                        return { kind: 'failed', category: 'invalid-response' };
                    }
                    bytes.set(chunk.value, size);
                    size += chunk.value.byteLength;
                }
            }
            finally {
                reader.releaseLock();
            }
            const raw = new TextDecoder().decode(bytes.subarray(0, size));
            let body;
            try {
                body = JSON.parse(raw);
            }
            catch {
                return { kind: 'failed', category: 'invalid-response' };
            }
            if (typeof body?.error?.code === 'number')
                return { kind: 'failed', category: byStatus(body.error.code) };
            if (!body?.answers || typeof body.answers !== 'object' || Array.isArray(body.answers))
                return { kind: 'failed', category: 'invalid-response' };
            return { kind: 'ok', answers: body.answers, ms: Math.round(performance.now() - started), decisionProvider: service.provider, decisionModel: service.model };
        }
        catch (error) {
            if (signal.aborted)
                return { kind: 'cancelled' };
            if (deadline.aborted)
                return { kind: 'failed', category: 'timeout' };
            // undici reports `redirect: 'error'` as a TypeError whose cause reads "unexpected redirect".
            const refusedRedirect = error?.cause?.message === 'unexpected redirect';
            return { kind: 'failed', category: refusedRedirect ? 'rejected' : 'unavailable' };
        }
    }
}
