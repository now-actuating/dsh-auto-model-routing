import { DEFAULT_PRESET_ID } from './presets/index.js';
export const AUTO_EFFORTS = ['low', 'medium', 'high', 'xhigh'];
/** Retired mapping keys: read and reported, never applied, dropped on the next save. */
export const DEPRECATED_KEYS = ['childRoutes', 'mainEfforts', 'policy'];
export const DEFAULT_SETTINGS = Object.freeze({ decisionToast: true, defaultMode: 'MANUAL', effortCap: 'xhigh', jevTimeoutMs: 8000, preset: DEFAULT_PRESET_ID });
