import type { SettingsIssue } from './settings-contract.js';
export declare const MODEL_ID_PATTERN: RegExp;
export declare function isRecord(value: unknown): value is Record<string, unknown>;
export declare function issue(path: string, code: string, message: string): SettingsIssue;
