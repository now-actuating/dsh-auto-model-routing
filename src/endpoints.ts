import type { RoutingState } from './state.js'

/** Identity of a live session as the endpoints need it. */
export interface AgentRef { id: string; origin?: string }
type Resolve = (id: string) => Promise<AgentRef | undefined>
const invalid = () => Response.json({ error: 'invalid request' }, { status: 400 })
const unknown = () => Response.json({ error: 'unknown ordinary session' }, { status: 404 })

/** Validates the session and applies `setMode`; the caller adds the policy host's view to the response. */
export async function endpoint(operation: 'state' | 'setMode', body: unknown, resolveAgent: Resolve, state: RoutingState): Promise<Response> {
  if (typeof body !== 'object' || body === null) return invalid()
  const { sessionId, mode } = body as { sessionId?: unknown; mode?: unknown }
  if (typeof sessionId !== 'string' || !sessionId || (operation === 'setMode' && mode !== 'AUTO' && mode !== 'MANUAL')) return invalid()
  const agent = await resolveAgent(sessionId)
  if (!agent || agent.origin === 'subagent') return unknown()
  if (operation === 'setMode') state.setMode(sessionId, mode as 'AUTO' | 'MANUAL')
  return Response.json(state.read(sessionId))
}
