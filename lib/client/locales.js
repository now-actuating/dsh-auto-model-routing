/**
 * Copy dictionaries for the AUTO client UI (composer chip, decision panel,
 * feedback label and the settings section).
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
export const NS = 'settings.autoModelRouting';
/** English strings (reference key set; values may contain `{placeholders}`). */
export const en = {
    preset: 'Judgement preset',
    presetHint: 'Each preset is a named, sourced set of Jev questions. It changes how the level is judged, never the effort ladder, cap or models.',
    presetDefault: 'default',
    strategyPreset: 'Selected judgement preset',
    strategyEvidence: 'Evidence',
    strategySources: 'Sources',
    routingFailed: 'The routing status request failed',
    feedbackFailed: 'The feedback request failed',
    notProvided: 'not provided',
    notDecided: 'not decided',
    toBeDetermined: 'to be determined',
    unknownService: 'unknown service',
    unknownModel: 'unknown model',
    sourceMain: 'main session',
    sourceChild: 'subtask',
    statusApplied: 'applied',
    statusFailed: 'not applied',
    statusUnsupported: 'adjustment unsupported',
    statusPending: 'decided / pending',
    capabilityLine: 'capability {capability} · decision confidence {confidence}',
    capabilitySpread: 'capability distribution: {list}',
    depthLine: 'investment {depth} · decision confidence {confidence}',
    presetLine: 'judgement preset {preset}',
    depthSpread: 'investment distribution: {list}',
    confidenceFormula: 'confidence = (top probability − 1/n) ÷ (1 − 1/n), with n candidates; it is not the task success rate',
    feedbackAppropriate: 'allocation fits',
    feedbackTooHigh: 'investment too high',
    feedbackTooLow: 'investment too low',
    feedbackUnknown: 'cannot tell',
    feedbackSummary: 'AUTO allocation: {depth} → {effort} · {model}',
    feedbackAsk: 'rate whether the resource allocation fits',
    feedbackYour: 'your rating: {label}',
    feedbackTitle: 'Did this resource allocation fit?',
    feedbackClear: 'Withdraw rating',
    feedbackNotSaved: 'Feedback was not saved, please retry',
    navLabel: 'Auto model routing',
    strategySummary: 'View the decision policy',
    strategyIntro: 'The Agent decomposes, dispatches and verifies; Jev only makes bounded judgments, and AUTO validates the catalog and applies the resource allocation. How each level is judged comes from the selected judgement preset below. This is a read-only description and changes no setting.',
    strategyCapability: 'Capability need (subtasks only)',
    strategyCapabilityBody: 'bounded: the method is clear and the result verifiable; analytical: investigation, correlated evidence or choosing between options; frontier: unusually hard original reasoning or coupled unknowns; insufficient_context: the goal or scope is missing, so stop and ask for it.',
    strategyDepth: 'Investment level (judged separately for the main session and subtasks)',
    strategyDepthBody: 'The main model never changes. Starting from the effort recommended for the concrete model, lower / baseline / higher step one level down, stay, or step one level up in the supported ladder; the current cap applies and max is never chosen automatically. A lighter model does not imply lower effort. The preset only changes how Jev chooses the level, never these rules.',
    strategyFamilies: 'Capability mapping of the current sub-models',
    strategyFamilyItem: '{level} → {model} (recommended start {start})',
    strategyCatalogDefault: 'catalog default',
    strategyTrailer: 'AUTO keeps the family prefix and the real provider and never falls back across entries; model and effort must both pass the current catalog and the official allowlist. Families without a registered strategy need an explicitly named model and a verifiable effort.',
    strategyLimits: 'Constraints, failures and recovery',
    strategyLimitsBody: 'An explicit model or effort wins; when both are given, AUTO only validates and does not ask Jev. When the goal is missing, the catalog is invalid or the capability judgment fails, AUTO stops dispatching instead of silently inheriting or switching models. A failed main judgment visibly disables AUTO. A fresh subtask binds its exact identity when created; later messages and resumes do not re-select a model. fork is not supported yet. MANUAL stops new judgments while already bound subtasks keep their initial route.',
    strategyRules: 'The exact Jev criteria',
    strategyRulesBody: 'The English rules used at runtime are shown below as-is, so translation cannot change their meaning; the two questions are independent and cannot read each other\'s answer.',
    keySaveFailed: 'The API key was not saved',
    settingsSaveFailed: 'Settings were not saved, please check the field errors and retry',
    settingsReadFailed: 'Could not read settings, reopen this page',
    readingSettings: 'Reading settings…',
    keySaved: 'API key saved',
    settingsSaved: 'Settings saved',
    settingsNotSaved: 'Settings were not saved',
    keyUnavailable: 'unavailable',
    keyFromEnv: 'from the launch environment',
    keyConfigured: 'configured',
    keyUnconfigured: 'not configured',
    keyUnavailableHint: 'The DSH credential service is unavailable.',
    keyEnvHint: 'Keep the existing key first: remove {ref} from the launch environment (for example .env.local) and restart, then save it here.',
    keyStoredHint: 'Stored in the DSH credential store, not in the settings file; leave it empty to keep the current key.',
    keyMissingHint: 'AUTO judgments stay disabled while no key is configured; saving a key does not resume sessions that were already disabled.',
    settingsUnavailable: 'Cannot read settings',
    settingsReadOnly: 'Settings are read-only',
    partialSaveFailed: 'Some changes were not saved, check the messages',
    save: 'Save',
    saving: 'Saving…',
    configInvalid: 'The settings file cannot be parsed or contains invalid fields; values shown come from what is parseable plus defaults, and saving overwrites the damaged part',
    deprecatedKeys: 'Old mappings in the settings file ({list}) no longer apply and are removed on the next save.',
    decisionService: 'Decision service',
    decisionServiceIntro: 'AUTO sends the redacted task to the selected decision service; there is no automatic fallback across services.',
    serviceSwitchNote: 'Save the new service first, then manage that service\'s own API key; the previous service\'s key is not reused.',
    credentialRef: 'Credential reference: {ref}',
    decisionModel: 'Decision model',
    freeModelsHint: 'The OpenRouter list is filled live by the Host from the public model API: only decision models that are free and currently available through the decisions endpoint.',
    modelsLoading: 'Loading free decision models…',
    modelsFailed: 'Could not load the model list; reopen to retry',
    modelsEmpty: 'No free decision model is available right now',
    modelNotInFreeList: 'not in the free list',
    compatibleEndpoint: 'Compatible endpoint ',
    customEndpointHint: 'Only the System One state/questions → answers contract; HTTPS or loopback HTTP; URL credentials, query strings and redirects are refused.',
    endpointLine: 'Endpoint: {endpoint}',
    connectionOk: 'Connection succeeded · {ms} ms',
    connectionFailed: 'Connection failed: {reason}',
    serviceUnavailable: 'service unavailable',
    connectFailedRetry: 'Could not reach the decision service, please retry',
    connectTestFailed: 'The connection test failed, check the network and retry',
    testing: 'Testing…',
    testConnection: 'Test connection',
    testInFlight: 'Requesting the selected decision service…',
    saveBeforeTest: 'Save the settings before testing the connection',
    testCost: 'A test costs one decision request without conversation content; save the settings first.',
    invalidService: 'Fill in a valid model and compatible endpoint',
    serviceKeyLabel: '{service} API Key',
    saveServiceFirst: 'Save the service selection first',
    stateAfterSave: 'read after saving',
    cancelRemoveKey: 'Cancel key removal',
    removeKey: 'Remove key',
    invalidKey: 'The API key must not contain whitespace and must be at most 512 characters',
    jevTimeout: 'Judgment wait limit',
    jevTimeoutHint: '1000–8000 ms, 8000 by default; after a timeout the session disables AUTO.',
    msSuffix: ' ms',
    sessionSection: 'Session',
    sessionIntro: 'The main model never changes; subtasks select model capability and reasoning investment independently and apply them at creation. MANUAL makes no automatic judgment.',
    defaultMode: 'Default mode for new sessions',
    defaultModeAutoHint: 'Only affects new sessions; every user turn sends the redacted task to the selected decision service to ask Jev.',
    defaultModeManualHint: 'Only affects new sessions and never changes existing ones.',
    decisionToast: 'Judgment hint',
    effortCap: 'Reasoning effort cap',
    autoSection: 'Automatic selection',
    autoIntro: 'The main session only adjusts the investment level; subtasks pick a capability tier that fits the goal and scope, then set the investment. Explicitly specified models and effort levels are preserved; there is no automatic retry or escalation.',
    autoCatalogNote: 'AUTO uses the full model id and the official allowlist; when the catalog is unavailable or the goal is unclear, AUTO stops and says so. fresh subtasks are supported, fork is not.',
    noticeNotRouted: 'The latest subtask was not routed: {reason} (runs on DSH defaults)',
    lockedModel: 'AUTO does not support the current model',
    lockedModelLine: '{provider} / {model} is outside automatic routing and the session switched to MANUAL.',
    lockedFamilies: 'Only the {families} family is supported for now; policies for other models are welcome as an issue or PR:',
    lockedHint: 'Switch back to a {families} model to enable AUTO again.',
    panelAutoTitle: 'Automatic reasoning effort',
    panelManualTitle: 'Manual: no automatic adjustment',
    panelOutput: 'This turn plugin output: {effort} · {reason}',
    panelLatest: 'Latest decision',
    panelDepth: 'AUTO · {depth}; the main model is unchanged and effort is applied per request; subtasks are selected automatically.',
    panelDisabled: 'Jev disabled ({category}): {hint}. {at}. Click AUTO to retry.',
    panelData: 'AUTO sends the redacted task text to the decision service selected in settings.',
    switchTitleLocked: 'AUTO only supports the {families} family; hover for details',
    switchTitleDisabled: 'Jev judgments are disabled: {hint}. Click AUTO to retry',
    switchTitleIdle: 'Click to toggle automatic reasoning effort',
    switchAriaLocked: 'Reasoning effort mode: {mode} (AUTO does not support the current model and cannot be toggled)',
    switchAria: 'Reasoning effort mode: {mode}, click to toggle',
    switchJevDisabled: '{mode} · Jev disabled',
    panelAria: 'Automatic routing status',
    listSeparator: ', ',
    unknownProvider: 'unknown provider',
    serviceOpenrouter: 'OpenRouter',
    serviceTypesafe: 'TypeSafe official',
    serviceConcentrate: 'Concentrate',
    serviceCustom: 'Custom System One',
    hintMissingCredential: 'No API key configured for the selected decision service',
    hintInsufficientCredits: 'Out of credits, please top up',
    hintUnauthorized: 'The key is invalid or lacks permission',
    hintRateLimited: 'The request was rate limited',
    hintRegionBlocked: 'Region blocked',
    hintRejected: 'The request was rejected',
    hintUnavailable: 'The Jev service is unavailable',
    hintTimeout: 'The Jev response timed out',
    hintInvalidResponse: 'The Jev response was invalid',
    panelUnchanged: 'not rewritten',
    panelNoJudgment: 'no judgment yet',
    modeLoading: 'loading',
};
let bound;
/** Bind the host translator. Called once from the client entry (`apply`). */
export function bindLocale(translator) {
    bound = translator;
}
/** Drop the bound translator and fall back to the English reference set (tests). */
export function resetLocale() {
    bound = undefined;
}
/** Interpolate `{name}` placeholders; unknown names stay verbatim. */
export function interpolate(template, params) {
    if (!params)
        return template;
    return template.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match);
}
/**
 * Translate one key. Without a bound translator the English reference set is
 * used, so unit tests and any embedding without a locale service use the same English copy.
 */
export function t(key, params) {
    return interpolate(bound === undefined ? en[key] : bound(key), params);
}
/** Localized labels for the built-in decision services. */
export const SERVICE_LABEL_KEYS = {
    openrouter: 'serviceOpenrouter',
    typesafe: 'serviceTypesafe',
    concentrate: 'serviceConcentrate',
    custom: 'serviceCustom',
};
/** Localized hint per failure category, keyed like `CATEGORY_HINTS`. */
export const CATEGORY_HINT_KEYS = {
    'missing-credential': 'hintMissingCredential',
    'insufficient-credits': 'hintInsufficientCredits',
    unauthorized: 'hintUnauthorized',
    'rate-limited': 'hintRateLimited',
    'region-blocked': 'hintRegionBlocked',
    rejected: 'hintRejected',
    unavailable: 'hintUnavailable',
    timeout: 'hintTimeout',
    'invalid-response': 'hintInvalidResponse',
};
