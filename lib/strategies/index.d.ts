import type { Capability, FamilyStrategy, StartEffort } from './types.js';
export type { Capability, FamilyStrategy, StartEffort } from './types.js';
export interface Registry {
    readonly strategies: readonly FamilyStrategy[];
    /** Main-model support decision; undefined means AUTO does not manage this model. */
    familyOfMainModel(model: string | undefined): FamilyStrategy | undefined;
    /** Catalog entry for a capability slot: same bare name (case-insensitive) and the parent's exact prefix, unique or none. */
    resolveSlot(familyId: string, capability: Capability, parentModel: string, models: readonly string[]): string | undefined;
    effortStart(model: string): StartEffort | undefined;
    get(familyId: string): FamilyStrategy | undefined;
    ids(): string[];
    labels(): string[];
}
/** Validates the whole list up front; any conflict throws and no partial registry exists. */
export declare function createRegistry(input: readonly FamilyStrategy[]): Registry;
export declare const BUILTIN_STRATEGIES: readonly FamilyStrategy[];
/** The registry every module uses unless a test injects strategies through `apply(ctx, { strategies })`. */
export declare const registry: Registry;
