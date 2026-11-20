import type { FeedbackBook } from './feedback.js';
import type { Context } from '@deepseek-ai/cordis';
import type { JevClient, Depth } from './jev.js';
import { type Registry } from './strategies/index.js';
import { PolicyStore } from './policy-store.js';
import type { RoutingState } from './state.js';
import type { RoutingCatalog, Settings } from './settings-contract.js';
export declare function policyHost(ctx: Context, deps: {
    selectModel: (request: {
        sessionId: string;
        provider: string;
        model: string;
        reasoningEffort: string;
    }) => Promise<unknown>;
    feedback: FeedbackBook;
    jev: JevClient;
    state: RoutingState;
    store: PolicyStore;
    settings: () => Settings;
    catalog: (provider?: string) => Promise<RoutingCatalog>;
    registry?: Registry;
}): {
    appliedDecision: (id: string) => number | undefined;
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
    mainStatus: (id: string) => {
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
        } & {
            preset?: string;
        };
        depth?: Depth;
        effort?: string;
        reason?: string;
    } | undefined;
};
