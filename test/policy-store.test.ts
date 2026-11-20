import { expect, it } from 'vitest'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PolicyStore, type ChildDecision } from '../src/policy-store.js'
it.each(['claude','dsh-magpie-connect','dsh-magpie-connector'] as const)('restores %s identity-only records and fails closed on corruption or unknown fields', (provider) => {
  const dir = mkdtempSync(join(tmpdir(),'policy-store-')), store = new PolicyStore(dir)
  const record: ChildDecision = { childId: '../../child', parentId: 'parent', rootId: 'root', status: 'recommended', path: 'ordinary', explicit: { provider }, route: { provider, model: provider === 'claude' ? 'claude-haiku-5-5' : 'claude/claude-haiku-5-5', reasoningEffort: 'medium' } }
  store.set(record)
  expect(new PolicyStore(dir).get(record.childId)).toEqual(record)
  const file = join(dir,readdirSync(dir)[0]!)
  expect(readFileSync(file,'utf8')).not.toContain('task')
  expect(() => store.set({ ...record, task: 'raw task' } as ChildDecision)).toThrow()
  writeFileSync(file,JSON.stringify({ ...record, childId: 'other' }))
  expect(() => store.get(record.childId)).toThrow('Cannot restore the subtask decision')
  writeFileSync(file,'broken')
  expect(() => store.get(record.childId)).toThrow('Cannot restore the subtask decision')
})

const base = (childId: string): ChildDecision => ({ childId, parentId: 'parent', rootId: 'root', status: 'recommended', path: 'ordinary', explicit: { provider: 'traex' } })
const route = { provider: 'traex', model: 'GPT-5.6-Sol', reasoningEffort: 'medium' as const }
it('spec Scenario "Reject new initial records without a parent snapshot"', () => {
  const dir = mkdtempSync(join(tmpdir(),'policy-store-')), store = new PolicyStore(dir)
  expect(() => store.create(base('new'))).toThrow('parentSelection')
  expect(store.get('new')).toBeUndefined(); expect(store.wasBound('new')).toBe(false)
  // Old applied records without a snapshot still restore on their original route.
  store.set({ ...base('old'), status: 'applied', route, actual: route })
  expect(new PolicyStore(dir).get('old')?.route).toEqual(route)
  store.create({ ...base('ok'), parentSelection: { provider: 'traex', model: 'GPT-5.6-Sol' } })
  expect(store.wasBound('ok')).toBe(true)
})
it('spec Scenario "Reject inconsistent record combinations"', () => {
  const dir = mkdtempSync(join(tmpdir(),'policy-store-')), store = new PolicyStore(dir)
  const bad: ChildDecision[] = [
    { ...base('a'), status: 'unsupported', reason: 'no-usable-route', route },
    { ...base('b'), status: 'applied' },
    { ...base('c'), status: 'recommended', route, actual: route },
  ]
  for (const record of bad) {
    expect(() => store.set(record), record.childId).toThrow()
    // Read side: a file written behind the store's back is equally rejected.
    writeFileSync(join(dir, `${(store as unknown as { path(id: string): string }).path(record.childId).split('/').pop()}`), JSON.stringify(record))
    expect(() => store.get(record.childId), record.childId).toThrow('Cannot restore the subtask decision')
  }
  expect(() => store.set({ ...base('d'), status: 'unsupported', reason: 'whatever' })).toThrow('Unknown reason for not routing')
  // A route-bearing failed record stays readable; the host rejects its requests.
  store.set({ ...base('e'), status: 'failed', route, reason: 'Actual request settings do not match the route' })
  expect(store.get('e')?.status).toBe('failed')
})
