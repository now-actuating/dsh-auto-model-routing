export const MODEL_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}(?![\s\S])/;
export function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function issue(path, code, message) { return { path, code, message }; }
