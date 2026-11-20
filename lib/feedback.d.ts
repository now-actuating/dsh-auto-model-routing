import { z } from 'zod';
export declare const allocationFeedback: readonly ["appropriate", "too-high", "too-low", "unknown"];
declare const schema: z.ZodObject<{
    sessionId: z.ZodString;
    messageId: z.ZodString;
    decisionId: z.ZodNumber;
    depth: z.ZodString;
    model: z.ZodString;
    effort: z.ZodString;
    snapshot: z.ZodOptional<z.ZodObject<{
        decidedAt: z.ZodNumber;
        appliedAt: z.ZodNumber;
        strategy: z.ZodOptional<z.ZodString>;
        preset: z.ZodOptional<z.ZodString>;
        policyVersion: z.ZodOptional<z.ZodString>;
        mappingVersion: z.ZodOptional<z.ZodString>;
        decisionProvider: z.ZodString;
        decisionModel: z.ZodString;
        ms: z.ZodNumber;
        confidence: z.ZodOptional<z.ZodNumber>;
        probabilities: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        provider: z.ZodString;
        requestSeq: z.ZodNumber;
        requestTurn: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    boundAt: z.ZodOptional<z.ZodNumber>;
    feedback: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        appropriate: "appropriate";
        "too-high": "too-high";
        "too-low": "too-low";
        unknown: "unknown";
    }>>>;
    feedbackAt: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
declare const factEvent: z.ZodObject<{
    type: z.ZodLiteral<"fact">;
    version: z.ZodOptional<z.ZodLiteral<1>>;
    sessionId: z.ZodString;
    decisionId: z.ZodNumber;
    fact: z.ZodEnum<{
        exposed: "exposed";
        "manual-switch": "manual-switch";
    }>;
    at: z.ZodNumber;
}, z.core.$strict>;
export type FeedbackFact = z.infer<typeof factEvent>['fact'];
export type FeedbackRecord = z.infer<typeof schema>;
/** Immutable decision bindings and separate feedback events; never includes task text or credentials. */
export declare class FeedbackBook {
    private file;
    private records;
    private factRecords;
    constructor(file: string);
    private key;
    lookup(sessionId: string, messageId: string): {
        sessionId: string;
        messageId: string;
        decisionId: number;
        depth: string;
        model: string;
        effort: string;
        snapshot?: {
            decidedAt: number;
            appliedAt: number;
            decisionProvider: string;
            decisionModel: string;
            ms: number;
            provider: string;
            requestSeq: number;
            strategy?: string | undefined;
            preset?: string | undefined;
            policyVersion?: string | undefined;
            mappingVersion?: string | undefined;
            confidence?: number | undefined;
            probabilities?: Record<string, number> | undefined;
            requestTurn?: number | undefined;
        } | undefined;
        boundAt?: number | undefined;
        feedback?: "appropriate" | "too-high" | "too-low" | "unknown" | null | undefined;
        feedbackAt?: number | undefined;
    } | undefined;
    /** The binding as the `label` endpoint returns it: historical snapshot keys are left out, nothing is inferred. */
    view(sessionId: string, messageId: string): {
        sessionId: string;
        messageId: string;
        decisionId: number;
        depth: string;
        model: string;
        effort: string;
        snapshot?: {
            decidedAt: number;
            appliedAt: number;
            decisionProvider: string;
            decisionModel: string;
            ms: number;
            provider: string;
            requestSeq: number;
            strategy?: string | undefined;
            preset?: string | undefined;
            policyVersion?: string | undefined;
            mappingVersion?: string | undefined;
            confidence?: number | undefined;
            probabilities?: Record<string, number> | undefined;
            requestTurn?: number | undefined;
        } | undefined;
        boundAt?: number | undefined;
        feedback?: "appropriate" | "too-high" | "too-low" | "unknown" | null | undefined;
        feedbackAt?: number | undefined;
    } | {
        snapshot: {
            decidedAt: number;
            appliedAt: number;
            decisionProvider: string;
            decisionModel: string;
            ms: number;
            provider: string;
            requestSeq: number;
            strategy?: string | undefined;
            preset?: string | undefined;
            confidence?: number | undefined;
            probabilities?: Record<string, number> | undefined;
            requestTurn?: number | undefined;
        };
        sessionId: string;
        messageId: string;
        decisionId: number;
        depth: string;
        model: string;
        effort: string;
        boundAt?: number | undefined;
        feedback?: "appropriate" | "too-high" | "too-low" | "unknown" | null | undefined;
        feedbackAt?: number | undefined;
    } | undefined;
    /** All folded bindings in file order (read-only; used by the usage report). */
    entries(): {
        sessionId: string;
        messageId: string;
        decisionId: number;
        depth: string;
        model: string;
        effort: string;
        snapshot?: {
            decidedAt: number;
            appliedAt: number;
            decisionProvider: string;
            decisionModel: string;
            ms: number;
            provider: string;
            requestSeq: number;
            strategy?: string | undefined;
            preset?: string | undefined;
            policyVersion?: string | undefined;
            mappingVersion?: string | undefined;
            confidence?: number | undefined;
            probabilities?: Record<string, number> | undefined;
            requestTurn?: number | undefined;
        } | undefined;
        boundAt?: number | undefined;
        feedback?: "appropriate" | "too-high" | "too-low" | "unknown" | null | undefined;
        feedbackAt?: number | undefined;
    }[];
    bind(record: FeedbackRecord): void;
    set(sessionId: string, messageId: string, feedback: typeof allocationFeedback[number] | null): void;
    facts(sessionId: string, decisionId: number): {
        exposed?: number;
        "manual-switch"?: number;
    };
    fact(sessionId: string, decisionId: number, fact: FeedbackFact): void;
    private append;
}
export {};
