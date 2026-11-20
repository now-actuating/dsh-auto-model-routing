export declare function redact(text: string): string;
interface HistoryMessage {
    role: string;
    source?: {
        kind: string;
    };
    content: readonly {
        type: string;
        text?: string;
    }[];
}
/** The previous turn, read from history before this turn's messages enter. Raw text: `buildState` redacts. */
export declare function previousTurn(messages: readonly HistoryMessage[]): {
    user?: string;
    assistant?: string;
};
/** The Jev `state`; every section is redacted, then cut. The fixed first line keeps the request bytes stable. */
/** Fixed call-path lines; they state the path only and never claim whether anyone reviews. */
export declare const EXECUTION_LINES: {
    readonly main: "Execution: main conversation.";
    readonly delegated: "Execution: delegated subtask; the result returns to an orchestrating agent.";
};
export type Execution = keyof typeof EXECUTION_LINES;
export declare function buildState(input: {
    prevUser?: string | undefined;
    prevAssistant?: string | undefined;
    text: string;
    execution?: Execution | undefined;
}): string;
export {};
