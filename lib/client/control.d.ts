export interface Rpc {
    call(channel: string, endpoint: string, payload: unknown): Promise<{
        ok: boolean;
        value?: unknown;
        error?: {
            message?: string;
        };
    }>;
}
export declare function callRouting(rpc: Rpc, sessionId: string, mode?: 'AUTO' | 'MANUAL'): Promise<unknown>;
export declare const chipOrder = -10;
/** Panel visibility: entering or focusing the chip (or its panel) opens it; leaving or blurring closes it. */
export type PanelEvent = 'enter' | 'focus' | 'leave' | 'blur';
export declare const panelOpenAfter: (event: PanelEvent) => boolean;
/** Latest Jev decision as returned by the state endpoint when the hint switch is on. */
export interface Decision {
    id: number;
    source: 'main' | 'subagent';
    tier?: string;
    effort: string;
    model?: string;
    confidence?: number;
    probabilities?: Record<string, number>;
    ms: number;
    depth: string;
    capability?: string;
    capabilityConfidence?: number;
    capabilityProbabilities?: Record<string, number>;
    preset?: string;
    decisionProvider?: string;
    decisionModel?: string;
    provider?: string;
    status?: string;
}
export interface Toast {
    id: number;
    lines: string[];
}
export declare const TOAST_MS = 3000;
/** Shared by the persistent hover panel and transient decision hint. */
export declare function toastText(d: Decision): string[];
/** A hint is shown only for a decision id not seen before (it is hidden TOAST_MS later by the chip). */
export declare function nextToast(seen: number | undefined, d: Decision | undefined): Toast | undefined;
