/**
 * Live catalog of free OpenRouter decision models.
 *
 * Only OpenRouter's public, unauthenticated model API is read; no credential
 * crosses this module. A model is listed only when it is currently callable for
 * free through the decisions endpoint the plugin uses:
 * - the catalog reports `decisions` output and `/api/alpha/decisions`,
 * - every catalog price is zero and the model has not expired,
 * - its own endpoint list has at least one available (status 0) endpoint
 *   whose prices are all zero.
 */
export declare const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models?output_modalities=decisions";
export interface DecisionModelEntry {
    id: string;
    name: string;
}
export type DecisionModelList = {
    status: 'ok';
    models: DecisionModelEntry[];
    fetchedAt: number;
} | {
    status: 'failed';
    reason: 'unavailable' | 'timeout' | 'invalid-response';
    fetchedAt: number;
};
type Fetch = (input: string, init: RequestInit) => Promise<Response>;
/** Fetches and filters the catalog once. Never throws. */
export declare function fetchFreeDecisionModels(fetchImpl?: Fetch, timeoutMs?: number, now?: () => number): Promise<DecisionModelList>;
/** Short-lived cache with in-flight de-duplication; `refresh` bypasses the cache. */
export declare function decisionModelCatalog(fetchImpl?: Fetch, now?: () => number): (refresh?: boolean) => Promise<DecisionModelList>;
export {};
