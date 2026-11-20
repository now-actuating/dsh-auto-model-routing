/** GPT family; the id stays `codex` (the local transport name). */
export declare const codex: {
    readonly id: "codex";
    readonly label: "GPT";
    readonly modelPrefixes: readonly ["gpt-"];
    readonly effortStarts: {
        readonly 'gpt-6.1-sol': "high";
        readonly 'gpt-6-luna': "high";
        readonly 'gpt-6-astra': "low";
    };
    readonly childModels: {
        readonly bounded: "gpt-6-luna";
        readonly analytical: "gpt-6.1-sol";
        readonly frontier: "gpt-6.1-sol";
    };
};
