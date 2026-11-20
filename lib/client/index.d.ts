import type { Context } from '@deepseek-ai/cordis';
import { type Decision, type Rpc, type Toast } from './control.js';
import type { JevCategory } from '../hints.js';
interface AutoSupport {
    supported: boolean;
    provider?: string;
    model?: string;
}
interface View {
    childNotice?: {
        id: number;
        childId: string;
        reason: string;
        at: number;
    };
    mode: 'AUTO' | 'MANUAL';
    disabled?: {
        category: JevCategory;
        at: number;
    };
    decision?: Decision;
    decisionToast?: boolean;
    autoSupport?: AutoSupport;
}
type SubscribeSelection = (sessionId: string, onChange: () => void) => () => void;
interface Props {
    sessionId: string;
    rpc: Rpc;
    subscribeSelection?: SubscribeSelection;
}
export declare const name = "dsh-auto-model-routing/client";
export declare const inject: string[];
export declare function RoutingChip({ sessionId, rpc, initialView, initiallyOpen, initialToast, subscribeSelection }: Props & {
    initialView?: View;
    initiallyOpen?: boolean;
    initialToast?: Toast;
}): import("react").DetailedReactHTMLElement<{
    ref: (el: HTMLSpanElement | null) => void;
    className: string;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
}, HTMLSpanElement> | null;
export declare function apply(ctx: Context): void;
export {};
