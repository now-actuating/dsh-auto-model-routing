/** Shape-based, best effort: applied to the whole text before any truncation. */
const RULES = [
    [/-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g, '<redacted>'],
    [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer <redacted>'],
    [/\b(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16})\b/g, '<redacted>'],
    // Match Chinese "password" and "authorization code" labels, including a fullwidth colon.
    [/(\u5bc6\u7801|\u6388\u6743\u7801|appid|password|passwd|token|api[_-]?key|secret)(["']?\s*[:\uff1a=]\s*["']?)[^\s"',;]+/gi, '$1$2<redacted>'],
    [/\/\/[^\s/:@]+:[^\s/@]+@/g, '//<redacted>@'],
    [/\b\d{1,3}(\.\d{1,3}){3}(:\d+)?\b/g, '<ip>'],
];
export function redact(text) {
    return RULES.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
}
/** Fixed call-path lines; they state the path only and never claim whether anyone reviews. The runtime only judges
 * delegated subtasks; `main` stays for the offline eval cases (`eval/cases.json`). */
export const EXECUTION_LINES = {
    main: 'Execution: main conversation.',
    delegated: 'Execution: delegated subtask; the result returns to an orchestrating agent.',
};
/** The Jev `state` of one subtask; the task is redacted, then cut. The fixed first line keeps the request bytes stable. */
export function buildState(input) {
    const lines = ['Previous user-turn tier: none'];
    if (input.execution)
        lines.push(EXECUTION_LINES[input.execution]);
    lines.push('User message:', redact(input.text).slice(0, 8000));
    return lines.join('\n');
}
