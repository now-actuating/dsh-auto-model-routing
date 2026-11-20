export interface ClaimedMessage {
    source?: {
        kind: string;
    };
    content: readonly {
        type: string;
        text?: string;
    }[];
}
export declare function userInput(messages: readonly ClaimedMessage[]): {
    userTurn: boolean;
    text: string;
};
