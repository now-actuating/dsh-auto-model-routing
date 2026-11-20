import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { type Registry } from './strategies/index.js';
/** One main-session model selection as the AUTO support gate needs it. */
export interface MainSelection {
    provider: string;
    model: string;
}
/**
 * AUTO only manages models whose family has a registered strategy. The transport
 * prefix (e.g. a gateway's `<family>/`) is not part of the family name, so only the
 * part after the last `/` is matched. Other families lock the session to MANUAL
 * instead of being guessed at.
 */
export declare function autoSupportedModel(model: string | undefined, registry?: Registry): boolean;
/** An unknown selection must never lock a session: only a proven mismatch does. */
export declare function mainSupported(selection: MainSelection | undefined, registry?: Registry): boolean;
/**
 * The main session's current model selection, most-authoritative signal first:
 * the official pending pick (`model/selection` projection), then the last actual
 * request header, then the creation-time agent options. Undefined when none can
 * be read; callers treat that as "unknown, do not lock".
 */
export declare function currentMainSelection(ctx: Context, agent: Agent): MainSelection | undefined;
