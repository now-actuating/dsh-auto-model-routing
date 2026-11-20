// Browser-safe: imported by the client bundle, so no Node built-ins here or in what it imports.
export type JevCategory =
  | 'missing-credential' | 'insufficient-credits' | 'unauthorized' | 'rate-limited'
  | 'region-blocked' | 'rejected' | 'unavailable' | 'timeout' | 'invalid-response'

/** Human-readable hint per category, shown on the chip, panel and tool errors. */
export const CATEGORY_HINTS: Readonly<Record<JevCategory, string>> = {
  'missing-credential': 'No API key configured for the selected decision service',
  'insufficient-credits': 'Out of credits, please top up',
  unauthorized: 'The key is invalid or lacks permission',
  'rate-limited': 'The request was rate limited',
  'region-blocked': 'Region blocked',
  rejected: 'The request was rejected',
  unavailable: 'The Jev service is unavailable',
  timeout: 'The Jev response timed out',
  'invalid-response': 'The Jev response was invalid',
}
