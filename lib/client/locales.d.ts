/**
 * Copy dictionaries for the AUTO client UI (composer chip, decision panel,
 * and the settings section).
 *
 * The plugin keeps a module-scoped translator instead of threading `t`
 * through every helper, `apply()` binds the host translator once, and before
 * that (unit tests, or a host without a locale service) the English reference
 * set is used. Placeholders use
 * the host's `{name}` syntax and are interpolated here, so the fallback path and
 * the bound path behave identically.
 *
 * @module dsh-auto-model-routing/client/locales
 */
/** The locale namespace this plugin owns. */
export declare const NS = "settings.autoModelRouting";
/** English strings (reference key set; values may contain `{placeholders}`). */
export declare const en: {
    preset: string;
    presetHint: string;
    presetDefault: string;
    strategyPreset: string;
    strategyEvidence: string;
    strategySources: string;
    routingFailed: string;
    notProvided: string;
    toBeDetermined: string;
    unknownService: string;
    unknownModel: string;
    sourceChild: string;
    statusApplied: string;
    statusFailed: string;
    statusUnsupported: string;
    statusPending: string;
    capabilityLine: string;
    capabilitySpread: string;
    depthLine: string;
    presetLine: string;
    depthSpread: string;
    confidenceFormula: string;
    navLabel: string;
    strategySummary: string;
    strategyIntro: string;
    strategyCapability: string;
    strategyCapabilityBody: string;
    strategyDepth: string;
    strategyDepthBody: string;
    strategyFamilies: string;
    strategyFamilyItem: string;
    strategyCatalogDefault: string;
    strategyTrailer: string;
    strategyLimits: string;
    strategyLimitsBody: string;
    strategyRules: string;
    strategyRulesBody: string;
    keySaveFailed: string;
    settingsSaveFailed: string;
    settingsReadFailed: string;
    readingSettings: string;
    keySaved: string;
    settingsSaved: string;
    settingsNotSaved: string;
    keyUnavailable: string;
    keyFromEnv: string;
    keyConfigured: string;
    keyUnconfigured: string;
    keyUnavailableHint: string;
    keyEnvHint: string;
    keyStoredHint: string;
    keyMissingHint: string;
    settingsUnavailable: string;
    settingsReadOnly: string;
    partialSaveFailed: string;
    save: string;
    saving: string;
    configInvalid: string;
    deprecatedKeys: string;
    decisionService: string;
    decisionServiceIntro: string;
    serviceSwitchNote: string;
    credentialRef: string;
    decisionModel: string;
    freeModelsHint: string;
    modelsLoading: string;
    modelsFailed: string;
    modelsEmpty: string;
    modelNotInFreeList: string;
    compatibleEndpoint: string;
    customEndpointHint: string;
    endpointLine: string;
    connectionOk: string;
    connectionFailed: string;
    serviceUnavailable: string;
    connectFailedRetry: string;
    connectTestFailed: string;
    testing: string;
    testConnection: string;
    testInFlight: string;
    saveBeforeTest: string;
    testCost: string;
    invalidService: string;
    serviceKeyLabel: string;
    saveServiceFirst: string;
    stateAfterSave: string;
    cancelRemoveKey: string;
    removeKey: string;
    invalidKey: string;
    jevTimeout: string;
    jevTimeoutHint: string;
    msSuffix: string;
    sessionSection: string;
    sessionIntro: string;
    defaultMode: string;
    defaultModeAutoHint: string;
    defaultModeManualHint: string;
    decisionToast: string;
    effortCap: string;
    autoSection: string;
    autoIntro: string;
    autoCatalogNote: string;
    noticeNotRouted: string;
    lockedModel: string;
    lockedModelLine: string;
    lockedFamilies: string;
    lockedHint: string;
    panelAutoTitle: string;
    panelManualTitle: string;
    panelLatest: string;
    panelAutoScope: string;
    panelManualScope: string;
    panelDisabled: string;
    panelData: string;
    switchTitleLocked: string;
    switchTitleDisabled: string;
    switchTitleIdle: string;
    switchAriaLocked: string;
    switchAria: string;
    switchJevDisabled: string;
    panelAria: string;
    listSeparator: string;
    unknownProvider: string;
    serviceOpenrouter: string;
    serviceTypesafe: string;
    serviceConcentrate: string;
    serviceCustom: string;
    hintMissingCredential: string;
    hintInsufficientCredits: string;
    hintUnauthorized: string;
    hintRateLimited: string;
    hintRegionBlocked: string;
    hintRejected: string;
    hintUnavailable: string;
    hintTimeout: string;
    hintInvalidResponse: string;
    modeLoading: string;
};
/** The key union, derived from the English reference set. */
export type AutoKey = keyof typeof en;
type Params = Record<string, string | number>;
type Translator = (key: AutoKey) => string;
/** Bind the host translator. Called once from the client entry (`apply`). */
export declare function bindLocale(translator: Translator): void;
/** Drop the bound translator and fall back to the English reference set (tests). */
export declare function resetLocale(): void;
/** Interpolate `{name}` placeholders; unknown names stay verbatim. */
export declare function interpolate(template: string, params?: Params): string;
/**
 * Translate one key. Without a bound translator the English reference set is
 * used, so unit tests and any embedding without a locale service use the same English copy.
 */
export declare function t(key: AutoKey, params?: Params): string;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The AUTO client copy (chip, panel and settings section). */
        [NS]: AutoKey;
    }
}
/** Localized labels for the built-in decision services. */
export declare const SERVICE_LABEL_KEYS: {
    readonly openrouter: "serviceOpenrouter";
    readonly typesafe: "serviceTypesafe";
    readonly concentrate: "serviceConcentrate";
    readonly custom: "serviceCustom";
};
/** Localized hint per failure category, keyed like `CATEGORY_HINTS`. */
export declare const CATEGORY_HINT_KEYS: {
    readonly 'missing-credential': "hintMissingCredential";
    readonly 'insufficient-credits': "hintInsufficientCredits";
    readonly unauthorized: "hintUnauthorized";
    readonly 'rate-limited': "hintRateLimited";
    readonly 'region-blocked': "hintRegionBlocked";
    readonly rejected: "hintRejected";
    readonly unavailable: "hintUnavailable";
    readonly timeout: "hintTimeout";
    readonly 'invalid-response': "hintInvalidResponse";
};
export {};
