import { z } from 'zod';
import { type Registry } from './strategies/index.js';
export declare const FALLBACK_REASONS: readonly ["jev-cancelled", "needs-context", "mode-changed", "interrupted", "no-usable-route", "explicit-unavailable"];
/** New `unsupported` writes use a closed reason set; `jev-<category>` carries the failure category. */
export declare const closedReason: (reason: string | undefined) => boolean;
declare function schemaFor(registry: Registry): z.ZodObject<{
    childId: z.ZodString;
    parentId: z.ZodString;
    rootId: z.ZodString;
    status: z.ZodEnum<{
        failed: "failed";
        recommended: "recommended";
        "needs-context": "needs-context";
        unsupported: "unsupported";
        applied: "applied";
    }>;
    path: z.ZodEnum<{
        ordinary: "ordinary";
        fork: "fork";
        teammate: "teammate";
    }>;
    family: z.ZodOptional<z.ZodEnum<{
        [x: string]: string;
    }>>;
    explicit: z.ZodObject<{
        provider: z.ZodString;
        model: z.ZodOptional<z.ZodString>;
        reasoningEffort: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    parentSelection: z.ZodOptional<z.ZodObject<{
        provider: z.ZodString;
        model: z.ZodOptional<z.ZodString>;
        reasoningEffort: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    decision: z.ZodOptional<z.ZodObject<{
        id: z.ZodNumber;
        source: z.ZodEnum<{
            main: "main";
            subagent: "subagent";
        }>;
        tier: z.ZodString;
        depth: z.ZodString;
        capability: z.ZodOptional<z.ZodString>;
        effort: z.ZodString;
        model: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        ms: z.ZodNumber;
        decisionProvider: z.ZodString;
        decisionModel: z.ZodString;
        confidence: z.ZodOptional<z.ZodNumber>;
        capabilityConfidence: z.ZodOptional<z.ZodNumber>;
        probabilities: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        capabilityProbabilities: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, z.core.$strict>>;
    route: z.ZodOptional<z.ZodObject<{
        provider: z.ZodString;
        model: z.ZodString;
        reasoningEffort: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
            xhigh: "xhigh";
        }>;
    }, z.core.$strict>>;
    actual: z.ZodOptional<z.ZodObject<{
        provider: z.ZodString;
        model: z.ZodString;
        reasoningEffort: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
            xhigh: "xhigh";
        }>;
    }, z.core.$strict>>;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type ChildDecision = z.infer<ReturnType<typeof schemaFor>>;
/** Strict per-child files: corrupt or mismatched records fail closed; no raw task or credentials. */
export declare class PolicyStore {
    private readonly directory;
    private readonly schema;
    constructor(directory: string, registry?: Registry);
    private path;
    bind(id: string): void;
    wasBound(id: string): boolean;
    get(id: string): ChildDecision | undefined;
    /** Initial binding of a new managed child: the parent snapshot is mandatory, then the marker. */
    create(value: ChildDecision): void;
    set(value: ChildDecision): void;
}
export {};
