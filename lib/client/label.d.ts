import { type ComponentType, type ReactElement, type ReactNode } from 'react';
import type { Rpc } from './control.js';
/** A reply bound to an applied AUTO decision; `{}` means no binding. */
interface Allocation {
    depth: string;
    effort: string;
    model: string;
    feedback?: string | null;
}
/** Official primitives, injected so the component carries no styles of its own (tests pass doubles). */
export interface LabelUi {
    Tooltip: ComponentType<{
        label: string;
        side?: 'bottom';
        children: ReactElement;
    }>;
    Menu: ComponentType<{
        open: boolean;
        anchor: ReactNode;
        items: readonly MenuEntry[];
        onSelect: (id: string) => void;
        onClose?: () => void;
        selectedId?: string;
        side?: 'top' | 'bottom';
        portal?: boolean;
    }>;
    Icon: ComponentType;
}
/** Same look as the official reply-bar buttons (copy, branch, feedback): values from dsh-client-ui-chat's action class. */
type MenuEntry = {
    id: string;
    label: string;
} | {
    type: 'label';
    id: string;
    text: string;
};
export declare function tooltipText(view: Allocation): string;
/** Reply-bar allocation feedback: shown only for replies bound to an applied AUTO decision. */
export declare function LabelButton({ sessionId, messageId, rpc, ui }: {
    sessionId: string;
    messageId: string;
    rpc: Rpc;
    ui: LabelUi;
}): import("react").DetailedReactHTMLElement<import("react").HTMLAttributes<HTMLSpanElement>, HTMLSpanElement> | null;
export {};
