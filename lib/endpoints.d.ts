import { type FeedbackBook } from './feedback.js';
import type { RoutingState } from './state.js';
/** Identity of a live session as the endpoints need it. */
export interface AgentRef {
    id: string;
    origin?: string;
}
type Resolve = (id: string) => Promise<AgentRef | undefined>;
/** Validates the session and applies `setMode`; the caller adds the policy host's view to the response. */
export declare function endpoint(operation: 'state' | 'setMode', body: unknown, resolveAgent: Resolve, state: RoutingState): Promise<Response>;
export declare function observeEndpoint(body: unknown, resolveAgent: Resolve, book: FeedbackBook, warn: () => void): Promise<Response>;
/** Query (no `feedback`) or change the allocation feedback of a reply. Unknown keys (e.g. a retired `label`) are rejected. */
export declare function labelEndpoint(body: unknown, resolveAgent: Resolve, book: FeedbackBook): Promise<Response>;
export {};
