import type { Context } from '@deepseek-ai/cordis';
import { SettingsStore } from './settings.js';
import type { RoutingCatalog } from './settings-contract.js';
/** Only the fixed credential reference and public catalog metadata cross this adapter. */
export declare function settingsHost(ctx: Context, store: SettingsStore): {
    catalog: (only?: string) => Promise<RoutingCatalog>;
    read: () => Promise<{
        models: readonly import("./settings-contract.js").RoutingModel[];
        childAllowlist: {
            status: "enabled" | "disabled" | "unavailable";
            allowedModels: readonly {
                provider: string;
                model: string;
            }[];
        };
        settings: import("./settings-contract.js").Settings;
        defaults: Readonly<import("./settings-contract.js").Settings>;
        configStatus: "ok" | "missing" | "invalid";
        issues: import("./settings-contract.js").SettingsIssue[];
        deprecated: string[];
        key: {
            available: boolean;
            configured: boolean;
            source?: string;
            writable: boolean;
        };
    }>;
    endpoint: (operation: "settings" | "saveSettings" | "setKey" | "testDecision", body: unknown) => Promise<Response>;
    credential: (name: string) => Promise<import("@deepseek-ai/dsh-launch-environment").LaunchEnvironmentEntry | import("@deepseek-ai/dsh-credentials").ResolvedCredential | undefined>;
};
