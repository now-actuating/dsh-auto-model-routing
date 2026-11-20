import { type DecisionConfig } from './decision-service.js';
export interface PolicyMeasure {
    ms: number;
    decisionProvider: string;
    decisionModel: string;
    confidence?: number;
    probabilities?: Record<string, number>;
    capabilityConfidence?: number;
    capabilityProbabilities?: Record<string, number>;
}
import type { Preset } from './presets/index.js';
export type Depth = 'lower' | 'baseline' | 'higher';
export type Capability = 'bounded' | 'analytical' | 'frontier';
export type PolicyResult = ({
    kind: 'ok';
    depth: Depth;
    capability?: Capability | 'insufficient_context';
} & PolicyMeasure) | {
    kind: 'failed';
    category: JevCategory;
} | {
    kind: 'cancelled';
};
import type { JevCategory } from './hints.js';
export { CATEGORY_HINTS, type JevCategory } from './hints.js';
export interface CredentialSource {
    get(name: string): {
        value: string;
    } | undefined | Promise<{
        value: string;
    } | undefined>;
}
export declare class JevClient {
    private readonly env;
    private readonly timeoutMs;
    private readonly service?;
    readonly url: string;
    constructor(env: CredentialSource, base?: string, timeoutMs?: number | (() => number), service?: (() => DecisionConfig | undefined) | undefined);
    /** One request, no retry. Never throws; never returns the body or the key. `state` comes from `buildState`. */
    judgePolicy(state: string, signal: AbortSignal, scope: 'main' | 'child', dimensions: 'both' | 'capability' | 'depth', preset: Preset): Promise<PolicyResult>;
    private decide;
}
