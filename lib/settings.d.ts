import { type SettingsIssue, type SettingsRead } from './settings-contract.js';
export { DEFAULT_SETTINGS } from './settings-contract.js';
export type { Settings, SettingsPatch, SettingsIssue, SettingsRead, RoutingCatalog } from './settings-contract.js';
export declare class SettingsValidationError extends Error {
    readonly issues: SettingsIssue[];
    constructor(issues: SettingsIssue[]);
}
export declare class SettingsStore {
    readonly path: string;
    constructor(path: string);
    read(): SettingsRead;
    save(patch: unknown): SettingsRead;
}
