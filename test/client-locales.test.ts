import { describe, expect, it, vi } from 'vitest'
import { apply } from '../src/client/index.js'
import { NS, bindLocale, en, interpolate, resetLocale, t } from '../src/client/locales.js'

describe('client locale dictionaries', () => {
  it('registers the same English dictionary for both host locale IDs', () => {
    const register = vi.fn()
    apply({ effect: (callback: () => void) => callback(), locale: { register, bind: () => (key: keyof typeof en) => en[key] }, slots: { inject: () => {} } } as never)
    expect(register).toHaveBeenCalledWith(NS, { zh: en, en })
  })

  it('every label is non-empty and the namespace is the AUTO settings namespace', () => {
    for (const value of Object.values(en)) expect(value.trim()).not.toBe('')
    expect(NS).toBe('settings.autoModelRouting')
  })

  it('falls back to the English dictionary before a translator is bound', () => {
    resetLocale()
    expect(t('navLabel')).toBe('Auto model routing')
    expect(t('noticeNotRouted', { reason: 'R' })).toBe('The latest subtask was not routed: R (runs on DSH defaults)')
  })

  it('binds the host translator and interpolates {placeholders}', () => {
    bindLocale(key => en[key])
    expect(t('navLabel')).toBe('Auto model routing')
    expect(t('credentialRef', { ref: 'OPENROUTER_API_KEY' })).toBe('Credential reference: OPENROUTER_API_KEY')
    expect(t('connectionOk', { ms: 42 })).toBe('Connection succeeded · 42 ms')
    expect(interpolate('a {x} b', { x: 1 })).toBe('a 1 b')
    expect(interpolate('no placeholders')).toBe('no placeholders')
  })
})
