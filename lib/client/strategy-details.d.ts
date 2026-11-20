import { type Localized, type Preset } from '../presets/index.js';
/** Read-only: criteria and slots are imported from the executable policy, never copied. */
/** The visible half of a preset's bilingual metadata. */
export declare const localized: (text: Localized) => string;
export declare function StrategyDetails({ preset }: {
    preset?: Preset;
}): import("react").DetailedReactHTMLElement<{
    className: string;
}, HTMLElement>;
