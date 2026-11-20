export type JevCategory = 'missing-credential' | 'insufficient-credits' | 'unauthorized' | 'rate-limited' | 'region-blocked' | 'rejected' | 'unavailable' | 'timeout' | 'invalid-response';
/** Human-readable hint per category, shown on the chip, panel and tool errors. */
export declare const CATEGORY_HINTS: Readonly<Record<JevCategory, string>>;
