import type { Settings, RoutingCatalog } from './settings-contract.js';
import type { JevClient } from './jev.js';
import type { RoutingState } from './state.js';
import { type Registry } from './strategies/index.js';
interface SessionLike {
    id: string;
    session: {
        header: {
            origin?: string;
            parentSession?: string;
        };
        requestHeader?: () => {
            config?: {
                provider?: string;
                model?: string;
                reasoningEffort?: string;
            };
        } | undefined;
    };
    options?: {
        provider?: string;
        model?: string;
        reasoningEffort?: string;
    };
}
export interface ToolDeps {
    /** Live agent registry (`ctx.agents`); used to walk a child up to its root session. */
    agents: {
        get(id: string): SessionLike | undefined;
    };
    state: RoutingState;
    readSettings: () => Settings;
    catalog: (provider?: string) => RoutingCatalog | Promise<RoutingCatalog>;
    registry?: Registry;
}
/** Preview only: the same Jev judgment AUTO uses, while the root session is AUTO. Writes no state. */
export declare function routeSubagentTool(jev: JevClient, deps: ToolDeps): import("@deepseek-ai/dsh-tools").ToolDefinition;
export {};
