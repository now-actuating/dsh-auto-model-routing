import { expect, it } from 'vitest'
import { buildState, previousTurn, redact } from '../src/context.js'

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

it('spec Scenario "Previous turn context is truncated and its tail is redacted"', () => {
  const longUser = 'Q'.repeat(900)
  const reply = `${'A'.repeat(3000 - 40)} token=abc123def456 at 10.1.2.3:8080`
  const messages = [
    user('An earlier question'),
    assistant('An earlier answer'),
    user('Host instructions', 'agent-instructions'),
    user(longUser),
    assistant('Earlier content'),
    { role: 'assistant', content: [{ type: 'tool-call', id: 't' }] },
    assistant(reply),
    { role: 'tool', content: [{ type: 'text', text: 'tool output' }] },
  ]
  const previous = previousTurn(messages)
  expect(previous).toEqual({ user: longUser, assistant: reply })
  const state = buildState({ prevUser: previous.user, prevAssistant: previous.assistant, text: 'Continue' })
  const lines = state.split('\n')
  expect(lines[0]).toBe('Previous user-turn tier: none')
  expect(state).toContain(`Previous user message (truncated):\n${'Q'.repeat(500)}\n`)
  expect(state).not.toContain('Q'.repeat(501))
  const redactedReply = redact(reply)
  expect(state).toContain(`Previous assistant reply (last part):\n${redactedReply.slice(-1200)}\n`)
  expect(state).not.toContain('Earlier content')
  expect(state).not.toContain('abc123def456')
  expect(state).not.toContain('10.1.2.3')
  expect(state).toContain('token=<redacted>')
  expect(state).toContain('<ip>')
  expect(state.endsWith('New user message:\nContinue')).toBe(true)
})

it('first_turn_state_has_no_context', () => {
  expect(previousTurn([user('Host instructions', 'agent-instructions')])).toEqual({})
  expect(buildState({ text: 'Look into this error' })).toBe('Previous user-turn tier: none\nUser message:\nLook into this error')
  // Only one side present: the explanation line stays, the missing section is omitted.
  const onlyUser = buildState({ prevUser: 'Fix the login flow', text: 'Continue' })
  expect(onlyUser.split('\n')[0]).toBe('Previous user-turn tier: none')
  expect(onlyUser).toContain('Previous user message (truncated):\nFix the login flow')
  expect(onlyUser).not.toContain('Previous assistant reply')
})
