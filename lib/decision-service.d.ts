export declare const DECISION_SERVICES: {
    readonly openrouter: {
        readonly label: "OpenRouter";
        readonly endpoint: "https://openrouter.ai/api/alpha/decisions";
        readonly model: "typesafe/jev-1.13";
        readonly credential: "OPENROUTER_API_KEY";
    };
    readonly typesafe: {
        readonly label: "TypeSafe official";
        readonly endpoint: "https://api.typesafe.ai/v1/systemone";
        readonly model: "jev-1.13.0";
        readonly credential: "TYPESAFE_API_KEY";
    };
    readonly concentrate: {
        readonly label: "Concentrate";
        readonly endpoint: "https://api.concentrate.ai/v1/systemone";
        readonly model: "jev-1.13.0";
        readonly credential: "CONCENTRATE_API_KEY";
    };
    readonly custom: {
        readonly label: "Custom System One";
        readonly endpoint: "";
        readonly model: "jev-1.13.0";
        readonly credential: "AUTO_DECISION_CUSTOM_API_KEY";
    };
};
export type DecisionProvider = keyof typeof DECISION_SERVICES;
export interface DecisionConfig {
    provider: DecisionProvider;
    model?: string | undefined;
    endpoint?: string | undefined;
}
export declare function validDecisionEndpoint(value: string): boolean;
export declare function resolveDecisionService(config?: DecisionConfig): {
    provider: "openrouter" | "typesafe" | "concentrate" | "custom";
    endpoint: string;
    model: string;
    credential: "OPENROUTER_API_KEY" | "TYPESAFE_API_KEY" | "CONCENTRATE_API_KEY" | "AUTO_DECISION_CUSTOM_API_KEY";
};
