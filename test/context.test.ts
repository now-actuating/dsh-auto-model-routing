import { expect, it } from 'vitest'
import { buildState, redact } from '../src/context.js'

const user = (text: string, kind = 'user') => ({ role: 'user', source: { kind }, content: [{ type: 'text', text }] })
const assistant = (text: string) => ({ role: 'assistant', content: [{ type: 'text', text }] })

it('spec Scenario "Redaction covers common secret formats without changing prose"', () => {
  const key = `sk-${'A1b2C3d4E5'.repeat(4)}`.slice(0, 40)
  const head = [
    '{"API_KEY": "abc123"}',
    'Token\uff1axyz789',
    'Authorization: Bearer abcdefgh12345',
    'ghp_0123456789abcdefghijABCD',
    'https://u:p@host/x',
    'What if the token expires?',
  ].join('\n')
  // The key starts 10 characters before the last-1200 boundary: truncating first would leave its tail.
  const tail = 'x'.repeat(1200 - 30)
  const text = `${head}\n${key}${tail}`
  expect(text.length - text.indexOf(key)).toBe(1200 + 10)
  const out = redact(text).slice(-1200)
  const whole = redact(text)
  for (const secret of ['abc123', 'xyz789', 'abcdefgh12345', 'ghp_0123', 'u:p@']) expect(whole).not.toContain(secret)
  for (let i = 0; i + 8 <= key.length; i++) expect(out).not.toContain(key.slice(i, i + 8))
  expect(whole).toContain('What if the token expires?')
  expect(whole).toContain('"API_KEY": "<redacted>')
  expect(whole).toContain('Token\uff1a<redacted>')
  expect(redact('\u5bc6\u7801\uff1apass123 \u6388\u6743\u7801=auth456')).toBe('\u5bc6\u7801\uff1a<redacted> \u6388\u6743\u7801=<redacted>')
  expect(whole).toContain('Bearer <redacted>')
  expect(whole).toContain('//<redacted>@host')
  expect(redact('-----BEGIN RSA PRIVATE KEY-----\nMIIE\n-----END RSA PRIVATE KEY-----')).toBe('<redacted>')
  expect(redact('AKIAABCDEFGHIJKLMNOP')).toBe('<redacted>')
  expect(redact('at 10.1.2.3:8080 ok')).toBe('at <ip> ok')
})

it('subtask_state_has_no_conversation_context', () => {
  expect(buildState({ text: 'Look into this error' })).toBe('Previous user-turn tier: none\nUser message:\nLook into this error')
  expect(buildState({ text: 'Fix it', execution: 'delegated' })).toBe('Previous user-turn tier: none\nExecution: delegated subtask; the result returns to an orchestrating agent.\nUser message:\nFix it')
  const long = `token=abc123def456 ${'x'.repeat(9000)}`
  const state = buildState({ text: long })
  expect(state).not.toContain('abc123def456')
  expect(state.split('\n').at(-1)!.length).toBe(8000)
  expect(state).not.toContain('Previous user message')
  expect(state).not.toContain('Previous assistant reply')
})
