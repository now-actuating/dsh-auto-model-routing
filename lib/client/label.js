import { createElement as h, useEffect, useRef, useState } from 'react';
import { t } from './locales.js';
const FEEDBACK_KEYS = { appropriate: 'feedbackAppropriate', 'too-high': 'feedbackTooHigh', 'too-low': 'feedbackTooLow', unknown: 'feedbackUnknown' };
const feedbackLabel = (id) => { const key = FEEDBACK_KEYS[id]; return key === undefined ? id : t(key); };
const bound = (value) => typeof value.depth === 'string';
const CSS = `.amr-label-action{width:calc(28px + var(--dsh-content-font-delta,0px));height:calc(28px + var(--dsh-content-font-delta,0px));border-radius:var(--dsw-radius-sm);color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;justify-content:center;align-items:center;padding:6px;display:inline-flex}.amr-label-action svg{width:calc(17px + var(--dsh-content-font-delta,0px));height:calc(17px + var(--dsh-content-font-delta,0px))}.amr-label-action:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}`;
async function callLabel(rpc, sessionId, messageId, feedback) {
    const result = await rpc.call('/api', 'auto-model-routing.label', { sessionId, messageId, ...(feedback !== undefined ? { feedback } : {}) });
    if (!result.ok)
        throw new Error(result.error?.message ?? t('feedbackFailed'));
    return (result.value ?? {});
}
export function tooltipText(view) {
    return view.feedback
        ? `${t('feedbackSummary', { depth: view.depth, effort: view.effort, model: view.model })} · ${t('feedbackYour', { label: feedbackLabel(view.feedback) })}`
        : `${t('feedbackSummary', { depth: view.depth, effort: view.effort, model: view.model })} · ${t('feedbackAsk')}`;
}
/** Reply-bar allocation feedback: shown only for replies bound to an applied AUTO decision. */
export function LabelButton({ sessionId, messageId, rpc, ui }) {
    const [view, setView] = useState(undefined);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');
    const exposureTarget = useRef(null);
    const alive = useRef(true);
    useEffect(() => () => { alive.current = false; }, []);
    useEffect(() => {
        let active = true;
        setView(undefined);
        // One query per message; `{}` (or an error) renders nothing.
        callLabel(rpc, sessionId, messageId).then(value => { if (active && bound(value))
            setView(value); }, () => { });
        return () => { active = false; };
    }, [rpc, sessionId, messageId]);
    useEffect(() => {
        const target = exposureTarget.current;
        if (!view || !target || typeof IntersectionObserver === 'undefined')
            return;
        let visible = false, sent = false;
        let timer;
        const update = () => {
            clearTimeout(timer);
            timer = undefined;
            if (!sent && visible && document.visibilityState === 'visible' && document.hasFocus()) {
                timer = setTimeout(() => {
                    if (!visible || document.visibilityState !== 'visible' || !document.hasFocus())
                        return;
                    sent = true;
                    void rpc.call('/api', 'auto-model-routing.observe', { sessionId, messageId }).catch(() => { });
                }, 3000);
            }
        };
        const observer = new IntersectionObserver(entries => {
            visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 1);
            update();
        }, { threshold: 1 });
        observer.observe(target);
        document.addEventListener('visibilitychange', update);
        window.addEventListener('focus', update);
        window.addEventListener('blur', update);
        return () => {
            clearTimeout(timer);
            observer.disconnect();
            document.removeEventListener('visibilitychange', update);
            window.removeEventListener('focus', update);
            window.removeEventListener('blur', update);
        };
    }, [view !== undefined, rpc, sessionId, messageId]);
    if (!view)
        return null;
    const chooseFeedback = (id) => {
        setOpen(false);
        setError('');
        // A failure leaves the shown feedback unchanged.
        callLabel(rpc, sessionId, messageId, id === 'clear' ? null : id).then(value => { if (alive.current && bound(value))
            setView(value); }, () => { if (alive.current)
            setError(t('feedbackNotSaved')); });
    };
    const button = h('button', { type: 'button', className: 'amr-label-action', 'aria-label': tooltipText(view), onClick: () => setOpen(value => !value) }, h(ui.Icon));
    return h('span', { ref: exposureTarget }, h('style', null, CSS), h(ui.Menu, {
        open, side: 'top', portal: true, onClose: () => setOpen(false),
        // The official menu draws the check on the selected row.
        ...(view.feedback ? { selectedId: view.feedback } : {}),
        items: [{ type: 'label', id: 'title', text: t('feedbackTitle') }, ...Object.keys(FEEDBACK_KEYS).map(id => ({ id, label: feedbackLabel(id) })), ...(view.feedback ? [{ id: 'clear', label: t('feedbackClear') }] : [])],
        onSelect: id => { if (Object.hasOwn(FEEDBACK_KEYS, id) || id === 'clear')
            chooseFeedback(id); },
        anchor: h(ui.Tooltip, { label: tooltipText(view), side: 'bottom', children: button }),
    }), error && h('span', { role: 'alert' }, error));
}
