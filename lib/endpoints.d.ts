import type { RoutingState } from './state.js';
/** Identity of a live session as the endpoints need it. */
export interface AgentRef {
    id: string;
    origin?: string;
}
type Resolve = (id: string) => Promise<AgentRef | undefined>;
/** Validates the session and applies `setMode`; the caller adds the policy host's view to the response. */
export declare function endpoint(operation: 'state' | 'setMode', body: unknown, resolveAgent: Resolve, state: RoutingState): Promise<Response>;
export {};
