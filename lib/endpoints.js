import { allocationFeedback } from './feedback.js';
const invalid = () => Response.json({ error: 'invalid request' }, { status: 400 });
const unknown = () => Response.json({ error: 'unknown ordinary session' }, { status: 404 });
/** Validates the session and applies `setMode`; the caller adds the policy host's view to the response. */
export async function endpoint(operation, body, resolveAgent, state) {
    if (typeof body !== 'object' || body === null)
        return invalid();
    const { sessionId, mode } = body;
    if (typeof sessionId !== 'string' || !sessionId || (operation === 'setMode' && mode !== 'AUTO' && mode !== 'MANUAL'))
        return invalid();
    const agent = await resolveAgent(sessionId);
    if (!agent || agent.origin === 'subagent')
        return unknown();
    if (operation === 'setMode')
        state.setMode(sessionId, mode);
    return Response.json(state.read(sessionId));
}
export async function observeEndpoint(body, resolveAgent, book, warn) {
    if (typeof body !== 'object' || body === null)
        return invalid();
    const { sessionId, messageId } = body;
    if (typeof sessionId !== 'string' || !sessionId || typeof messageId !== 'string' || !messageId)
        return invalid();
    const agent = await resolveAgent(sessionId);
    if (!agent || agent.origin === 'subagent')
        return unknown();
    const binding = book.lookup(sessionId, messageId);
    if (binding)
        try {
            book.fact(sessionId, binding.decisionId, 'exposed');
        }
        catch {
            warn();
        }
    return Response.json({});
}
/** Query (no `feedback`) or change the allocation feedback of a reply. Unknown keys (e.g. a retired `label`) are rejected. */
export async function labelEndpoint(body, resolveAgent, book) {
    if (typeof body !== 'object' || body === null || Array.isArray(body))
        return invalid();
    if (Object.keys(body).some(key => !['sessionId', 'messageId', 'feedback'].includes(key)))
        return invalid();
    const { sessionId, messageId } = body;
    if (typeof sessionId !== 'string' || !sessionId || typeof messageId !== 'string')
        return invalid();
    const agent = await resolveAgent(sessionId);
    if (!agent || agent.origin === 'subagent')
        return unknown();
    const hasFeedback = Object.hasOwn(body, 'feedback');
    const feedback = body.feedback;
    if (hasFeedback && feedback !== null && !allocationFeedback.includes(feedback))
        return Response.json({ error: 'invalid feedback' }, { status: 400 });
    if (!book.lookup(sessionId, messageId))
        return hasFeedback ? Response.json({ error: 'no applied decision' }, { status: 404 }) : Response.json({});
    if (hasFeedback) {
        try {
            book.set(sessionId, messageId, feedback);
        }
        catch {
            return Response.json({ error: 'could not record feedback' }, { status: 500 });
        }
    }
    return Response.json(book.view(sessionId, messageId));
}
