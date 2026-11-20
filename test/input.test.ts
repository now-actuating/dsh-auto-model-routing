import { expect, it } from 'vitest'
import { userInput } from '../src/input.js'

it('spec Scenario "First-turn input only includes user messages from the actual intake sequence"', () => {
  const kinds = ['agent-instructions', 'plugin:dsh-memex', 'runtime-context', 'time-context', 'skill-catalog', 'user']
  expect(userInput(kinds.map(kind => ({ source: { kind }, content: [{ type: 'text', text: kind === 'user' ? 'Fix the login bug' : kind }] })))).toEqual({ userTurn: true, text: 'Fix the login bug' })
  expect(userInput([{ source: { kind: 'plugin' }, content: [{ type: 'text', text: 'ignore' }] }])).toEqual({ userTurn: false, text: '' })
})
it('spec Scenario "Multiple user messages are joined in order and truncated"', () => {
  expect(userInput([
    { source: { kind: 'user' }, content: [{ type: 'text', text: 'Check the logs first' }] },
    { content: [{ type: 'text', text: 'excluded' }] },
    { source: { kind: 'user' }, content: [{ type: 'image' }, { type: 'text', text: 'Then update the configuration' }] },
  ]).text).toBe('Check the logs first\nThen update the configuration')
  const text = 'a'.repeat(7999) + '😀'
  expect(userInput([{ source: { kind: 'user' }, content: [{ type: 'text', text }] }]).text).toBe(text.slice(0, 8000))
  expect(userInput([{ source: { kind: 'user' }, content: [{ type: 'image' }] }])).toEqual({ userTurn: true, text: '' })
})
it('redacts_before_bounding', () => {
  // A key straddling the 8000 boundary must not leave its head behind after the cut.
  const text = 'a'.repeat(7990) + ' sk-' + 'Z'.repeat(30)
  const out = userInput([{ source: { kind: 'user' }, content: [{ type: 'text', text }] }]).text
  expect(out).toBe(('a'.repeat(7990) + ' <redacted>').slice(0, 8000))
  expect(out).not.toContain('sk-')
})
