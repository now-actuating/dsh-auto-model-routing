import type { Capability, Depth } from './jev.js';
import { type AutomaticEffort, type RoutingCatalog } from './settings-contract.js';
import { type Registry } from './strategies/index.js';
type Allowed = readonly {
    provider: string;
    model: string;
}[];
/** Whether a route is usable now: live catalog, enabled official allowlist, captured allowlist (if any) and the effort cap. */
export declare function routeUsable(catalog: RoutingCatalog, provider: string, model: string, effort: string, cap: AutomaticEffort, captured?: Allowed): boolean;
/** Bound routes are re-checked on every request; any gate failure rejects that request. */
export declare function validatePolicyRoute(catalog: RoutingCatalog, provider: string, model: string, effort: string, cap: AutomaticEffort, captured?: Allowed): void;
export declare function policyEffort(model: string, depth: Depth, supported: readonly string[], cap: AutomaticEffort, defaultEffort?: string, registry?: Registry): AutomaticEffort;
export interface PolicyRoute {
    provider: string;
    model: string;
    reasoningEffort: AutomaticEffort;
}
export type RouteFallback = 'no-usable-route' | 'explicit-unavailable';
export interface ChildRouteInput {
    provider: string;
    parent: {
        model?: string | undefined;
        reasoningEffort?: string | undefined;
    };
    explicit: {
        model?: string | undefined;
        reasoningEffort?: string | undefined;
    };
    capability: Capability;
    depth: Depth;
    catalog: RoutingCatalog;
    cap: AutomaticEffort;
    captured?: Allowed | undefined;
}
/**
 * Fallback chain: capability slot → keep model with depth effort → parent effort (automatic effort only) → no rewrite.
 * Provider never changes; explicit dimensions are never replaced.
 */
export declare function chooseChildRoute(input: ChildRouteInput, registry?: Registry): {
    route: PolicyRoute;
} | {
    fallback: RouteFallback;
};
export {};
