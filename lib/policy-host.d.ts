import type { Context } from '@deepseek-ai/cordis';
import type { JevClient } from './jev.js';
import { type Registry } from './strategies/index.js';
import { PolicyStore } from './policy-store.js';
import type { RoutingState } from './state.js';
import type { RoutingCatalog, Settings } from './settings-contract.js';
/**
 * AUTO routes fresh children only. Main sessions are never judged and never rewritten: no decision call, no model selection,
 * so the main request keeps the user's choice (and its prompt cache) on every turn.
 */
export declare function policyHost(ctx: Context, deps: {
    jev: JevClient;
    state: RoutingState;
    store: PolicyStore;
    settings: () => Settings;
    catalog: (provider?: string) => Promise<RoutingCatalog>;
    registry?: Registry;
}): {
    invalidate: (id: string) => void;
    childNotice: (rootId: string) => {
        id: number;
        childId: string;
        reason: string;
        at: number;
    } | undefined;
    status: (id: string) => {
        childId: string;
        parentId: string;
        rootId: string;
        status: "failed" | "recommended" | "needs-context" | "unsupported" | "applied";
        path: "ordinary" | "fork" | "teammate";
        explicit: {
            provider: string;
            model?: string | undefined;
            reasoningEffort?: string | undefined;
        };
        family?: string | undefined;
        parentSelection?: {
            provider: string;
            model?: string | undefined;
            reasoningEffort?: string | undefined;
        } | undefined;
        decision?: {
            id: number;
            source: "main" | "subagent";
            tier: string;
            depth: string;
            effort: string;
            status: string;
            ms: number;
            decisionProvider: string;
            decisionModel: string;
            capability?: string | undefined;
            model?: string | undefined;
            provider?: string | undefined;
            confidence?: number | undefined;
            capabilityConfidence?: number | undefined;
            probabilities?: Record<string, number> | undefined;
            capabilityProbabilities?: Record<string, number> | undefined;
        } | undefined;
        route?: {
            provider: string;
            model: string;
            reasoningEffort: "low" | "medium" | "high" | "xhigh";
        } | undefined;
        actual?: {
            provider: string;
            model: string;
            reasoningEffort: "low" | "medium" | "high" | "xhigh";
        } | undefined;
        reason?: string | undefined;
    } | undefined;
    /** The root's latest child decision (AUTO only); the main session itself has no decision. */
    latestDecision: (id: string) => ({
        id: number;
        source: "main" | "subagent";
        tier: string;
        depth: string;
        effort: string;
        status: string;
        ms: number;
        decisionProvider: string;
        decisionModel: string;
        capability?: string | undefined;
        model?: string | undefined;
        provider?: string | undefined;
        confidence?: number | undefined;
        capabilityConfidence?: number | undefined;
        probabilities?: Record<string, number> | undefined;
        capabilityProbabilities?: Record<string, number> | undefined;
    } & {
        preset?: string;
    }) | undefined;
};
