export type PresetContext = 'execution';
export interface Localized {
    readonly zh: string;
    readonly en: string;
}
export interface PresetSource {
    readonly title: string;
    readonly url: string;
    readonly date: string;
}
export interface RubricQuestion {
    readonly type: string;
    readonly instructions: string;
    readonly criteria: Readonly<Record<string, string>>;
}
export interface Rubric {
    readonly capability: RubricQuestion;
    readonly depth: RubricQuestion;
}
/** A built-in, immutable judgement preset: the questions Jev sees plus where they came from. */
export interface Preset {
    readonly id: string;
    readonly rubric: Rubric;
    readonly title: Localized;
    readonly summary: Localized;
    readonly evidence: Localized;
    readonly sources: readonly PresetSource[];
    readonly context: readonly PresetContext[];
}
/** First entry is the default. Published judgement content never changes in place: add a new id instead. */
export declare const PRESETS: readonly Preset[];
export declare const DEFAULT_PRESET_ID: string;
/** Structural constraints of a preset list. Called by tests only; the runtime never throws on metadata. */
export declare function presetIssues(list: readonly Preset[]): string[];
/** Unknown or missing ids resolve to the default preset. */
export declare function resolvePreset(id: unknown): Preset;
