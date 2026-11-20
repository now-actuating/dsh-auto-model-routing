import type { Context } from '@deepseek-ai/cordis';
import { type FamilyStrategy } from './strategies/index.js';
export declare const name = "dsh-auto-model-routing";
/** Child decision records. The historical directory name is kept on purpose: records are not migrated. */
export declare const CHILD_DECISIONS_DIR = "state/auto-model-routing/policy-v2";
export declare const inject: string[];
/** Test seams only; production uses the defaults. */
export interface Config {
    home?: string;
    jevBase?: string;
    jevTimeoutMs?: number;
    strategies?: readonly FamilyStrategy[];
}
export declare function apply(ctx: Context, config?: Config): void;
