import { afterEach, expect, it } from 'vitest'
import { resolvePreset } from '../src/presets/index.js'
import { closeHarness, depth, harness as mainHarness } from './host-harness.js'
import { callTool, closePolicyHarness, harness as childHarness } from './policy-harness.js'

afterEach(async () => { await closeHarness(); await closePolicyHarness() })

const EAV = resolvePreset('effort-as-verification').rubric
const RD = resolvePreset('reasoning-depth').rubric
const CHILD_LINE = 'Execution: delegated subtask; the result returns to an orchestrating agent.'
type Body = { state: string; questions: Record<string, unknown> }
const bodies = (h: { jev: { bodies: unknown[] } }) => h.jev.bodies as Body[]
const preview = (h: Awaited<ReturnType<typeof childHarness>>, task: string) =>
  callTool(h.ctx, h.parent, 'route_subagent', { task, provider: 'claude' })

it('spec Scenario "Presets with execution context add a fixed line"', async () => {
  // Main turns are never judged, whatever the preset.
  const m = await mainHarness(depth('baseline'), { config: { preset: 'effort-as-verification' } })
  await m.setMode('AUTO')
  await m.run('Look into this error')
  expect(bodies(m)).toHaveLength(0)
  await closeHarness()

  const c = await childHarness()
  c.configure({ preset: 'effort-as-verification' })
  c.setChildTask('Organize the logs')
  await c.invoke()
  await preview(c, 'Organize the logs')
  const sent = bodies(c)
  expect(sent).toHaveLength(2)
  for (const b of sent) {
    expect(b.state).toBe(`Previous user-turn tier: none\n${CHILD_LINE}\nUser message:\nOrganize the logs`)
    expect(b.questions).toEqual(EAV)
  }
  expect(RD).not.toEqual(EAV)
})

it('spec Scenario "An unknown configured preset falls back to the default"', async () => {
  const c = await childHarness()
  c.configure({ preset: 'does-not-exist' })
  c.setChildTask('Organize the logs')
  await c.invoke()
  expect(bodies(c)).toHaveLength(1)
  expect(bodies(c)[0]!.questions).toEqual(RD)
  expect(bodies(c)[0]!.state).not.toContain('Execution:')
})

it('spec Scenario "Switch presets after child creation and before its first judgment"', async () => {
  // DSH 0.2.2: the child's judgement runs in its `agent/created` (the credential gate holds it in flight); the preset is
  // captured when it starts. A change while it is in flight, and another after creation and before the first request, change nothing.
  const c = await childHarness(false, false, 'claude', false, {}, undefined, { gatedCredentials: true })
  c.configure({ preset: 'effort-as-verification' })
  const release = c.holdCredentials()
  void release.reached.then(() => { c.configure({ preset: 'reasoning-depth' }); release() })
  c.beforeChildRun(() => { c.configure({ preset: 'effort-as-verification' }) })
  await c.invoke()
  const sent = bodies(c)
  expect(sent).toHaveLength(1)
  expect(sent[0]!.questions).toEqual(EAV)
  expect(sent[0]!.state).toContain(CHILD_LINE)
  const child = c.handles[1]!.agent
  const route = c.store.get(child.id)!.route!
  expect(c.calls.at(-1)).toMatchObject({ provider: route.provider, model: route.model, reasoningEffort: route.reasoningEffort })
})


it('spec Scenario "Switch presets during preview"', async () => {
  const c = await childHarness(false, false, 'claude', false, {}, undefined, { gatedCredentials: true })
  c.configure({ preset: 'reasoning-depth' })
  const release = c.holdCredentials()
  const first = preview(c, 'Organize the logs')
  await release.reached
  c.configure({ preset: 'effort-as-verification' })
  release()
  await first
  expect(bodies(c)).toHaveLength(1)
  expect(bodies(c)[0]!.questions).toEqual(RD)
  expect(bodies(c)[0]!.state).not.toContain('Execution:')
  await preview(c, 'Organize the logs')
  expect(bodies(c)[1]!.questions).toEqual(EAV)
  expect(bodies(c)[1]!.state).toContain(CHILD_LINE)
})


it('spec Scenario "Preview and fresh subtasks sample presets independently"', async () => {
  const c = await childHarness()
  c.configure({ preset: 'reasoning-depth' })
  c.setChildTask('Organize the logs')
  await preview(c, 'Organize the logs')
  c.configure({ preset: 'effort-as-verification' })
  await c.invoke()
  expect(bodies(c)).toHaveLength(2)
  expect(bodies(c)[0]!.questions).toEqual(RD)
  expect(bodies(c)[1]!.questions).toEqual(EAV)
})


it('spec Scenario "Switching presets does not change bound subtasks"', async () => {
  // A bound child keeps its route; main turns are never judged before or after.
  const c = await childHarness()
  c.configure({ preset: 'reasoning-depth' })
  await c.run(c.parent, 'Main task')
  expect(c.jev.bodies).toHaveLength(0)
  await c.invoke()
  const child = c.handles.at(-1)!.agent
  const record = JSON.stringify(c.store.get(child.id))
  const route = c.store.get(child.id)?.route
  const judged = c.jev.bodies.length
  expect(judged).toBe(1)
  c.configure({ preset: 'effort-as-verification' })
  await c.run(child, 'later task')
  expect(c.jev.bodies.length).toBe(judged)
  expect(c.calls.at(-1)).toMatchObject({ model: route!.model, reasoningEffort: route!.reasoningEffort })
  expect(JSON.stringify(c.store.get(child.id))).toBe(record)
  await c.run(c.parent, 'Next main task')
  expect(c.jev.bodies.length).toBe(judged)
  // The next fresh child uses the new preset.
  await c.invoke()
  expect((c.jev.bodies.at(-1) as Body).questions).toEqual(EAV)
})

it('spec Scenario "Decision notifications identify the preset used"', async () => {
  const { toastText } = await import('../src/client/control.js')
  // Judged subtask: attributed to the preset captured at its first judgement; the persisted record stays unchanged.
  const c = await childHarness()
  c.configure({ preset: 'effort-as-verification' })
  await c.invoke()
  const child = c.handles.at(-1)!.agent
  const root = await c.callEndpoint('state', { sessionId: c.parent.id }) as { decision?: { source: string; preset?: string } }
  expect(root.decision).toMatchObject({ source: 'subagent', preset: 'effort-as-verification' })
  const lines = toastText(root.decision as never)
  expect(lines[0]).toBe('subtask · applied')
  expect(lines[1]).toBe('judgement preset Effort as verification')
  for (const key of ['version', 'policyVersion', 'mappingVersion', 'rubricVersion']) expect(JSON.stringify(root)).not.toContain(`"${key}"`)
  expect(JSON.stringify(c.store.get(child.id))).not.toContain('preset')
  // Fully explicit subtask: no judgement, so no preset line.
  await c.invoke({ model: 'claude-haiku-5-5', reasoning_effort: 'low' })
  const explicit = await c.callEndpoint('state', { sessionId: c.parent.id }) as { decision?: { decisionProvider?: string; preset?: string } }
  expect(explicit.decision).toMatchObject({ decisionProvider: 'explicit' })
  expect(explicit.decision).not.toHaveProperty('preset')
  expect(toastText(explicit.decision as never).some(l => l.startsWith('judgement preset'))).toBe(false)
})
