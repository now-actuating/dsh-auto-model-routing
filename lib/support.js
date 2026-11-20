import { registry as builtin } from './strategies/index.js';
/**
 * AUTO only manages models whose family has a registered strategy. The transport
 * prefix (e.g. a gateway's `<family>/`) is not part of the family name, so only the
 * part after the last `/` is matched. Other families lock the session to MANUAL
 * instead of being guessed at.
 */
export function autoSupportedModel(model, registry = builtin) {
    return registry.familyOfMainModel(model) !== undefined;
}
/** An unknown selection must never lock a session: only a proven mismatch does. */
export function mainSupported(selection, registry = builtin) {
    return selection === undefined || autoSupportedModel(selection.model, registry);
}
/**
 * The main session's current model selection, most-authoritative signal first:
 * the official pending pick (`model/selection` projection), then the last actual
 * request header, then the creation-time agent options. Undefined when none can
 * be read; callers treat that as "unknown, do not lock".
 */
export function currentMainSelection(ctx, agent) {
    try {
        const service = ctx.get('sessionProjections');
        const pending = service?.stateOf(agent.session, 'modelSelection')?.pending;
        if (pending && typeof pending.provider === 'string' && typeof pending.model === 'string')
            return { provider: pending.provider, model: pending.model };
    }
    catch { /* optional projection: fall through to the durable header */ }
    const header = agent.session.requestHeader()?.config;
    if (header && typeof header.provider === 'string' && typeof header.model === 'string')
        return { provider: header.provider, model: header.model };
    const options = agent.options;
    if (typeof options.provider === 'string' && typeof options.model === 'string')
        return { provider: options.provider, model: options.model };
    return undefined;
}
