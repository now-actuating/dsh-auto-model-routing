import type { Rpc } from './control.js';
import { type RoutingCatalog, type Settings, type SettingsIssue } from '../settings-contract.js';
import type { SettingsUi } from './settings-ui.js';
export interface SettingsView extends RoutingCatalog {
    settings: Settings;
    defaults: Settings;
    configStatus: string;
    issues: SettingsIssue[];
    key: {
        configured: boolean;
        source?: string;
        writable: boolean;
        available: boolean;
    };
    /** Retired mapping keys still present in the settings file. */
    deprecated?: string[];
}
/** Settings drafts are independent from the official session model selection. */
export declare function RoutingSettings({ rpc, ui }: {
    rpc: Rpc;
    ui: SettingsUi;
}): import("react").DetailedReactHTMLElement<{
    className: string;
}, HTMLElement>;
