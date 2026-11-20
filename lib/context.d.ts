export declare function redact(text: string): string;
/** Fixed call-path lines; they state the path only and never claim whether anyone reviews. The runtime only judges
 * delegated subtasks; `main` stays for the offline eval cases (`eval/cases.json`). */
export declare const EXECUTION_LINES: {
    readonly main: "Execution: main conversation.";
    readonly delegated: "Execution: delegated subtask; the result returns to an orchestrating agent.";
};
export type Execution = keyof typeof EXECUTION_LINES;
/** The Jev `state` of one subtask; the task is redacted, then cut. The fixed first line keeps the request bytes stable. */
export declare function buildState(input: {
    text: string;
    execution?: Execution | undefined;
}): string;
