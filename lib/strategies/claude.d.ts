export declare const claude: {
    readonly id: "claude";
    readonly label: "Claude";
    readonly modelPrefixes: readonly ["claude-"];
    readonly effortStarts: {
        readonly 'claude-opus-5-5': "medium";
        readonly 'claude-sonnet-5-5': "medium";
        readonly 'claude-haiku-5-5': "medium";
        readonly 'claude-fable-5-1': "high";
    };
    readonly childModels: {
        readonly bounded: "claude-haiku-5-5";
        readonly analytical: "claude-sonnet-5-5";
        readonly frontier: "claude-opus-5-5";
    };
};
