import { afterEach, expect, it } from 'vitest'
import { SessionId } from '@deepseek-ai/dsh-session'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { json } from './fake-jev.js'
import { closeHarness, depth, harness, lastAssistantId } from './host-harness.js'
afterEach(async () => { await closeHarness() })

// 0.7.1+mod.4: AUTO routes fresh children only. A main session is never judged, never rewritten and never sends anything out.
it('spec Scenario "AUTO main turns call no decision service and keep the user\'s selection"', async () => {
 let tools = 2
 const h = await harness(depth('higher'), { toolCalls: () => tools--, answer: () => 'reply' })
 await h.setMode('AUTO')
 await h.run('Investigate several modules')
 await h.run('Keep investigating')
 h.agent.followup(createUserMessage({ content: [{ type: 'text', text: 'Child session completed' }], source: { kind: 'plugin' } as never })); await h.agent.whenIdle()
 expect(h.jev.bodies).toHaveLength(0)
 expect(h.selections).toEqual([])
 expect(h.calls.length).toBeGreaterThanOrEqual(4)
 for (const call of h.calls) expect(call).toMatchObject({ provider: 'test', model: 'claude-opus-5-5', reasoningEffort: 'medium' })
 const state = await h.invoke('state', { sessionId: h.agent.id })
 expect(state).toMatchObject({ mode: 'AUTO' })
 for (const key of ['decision', 'depth', 'effort', 'reason', 'disabled']) expect(state).not.toHaveProperty(key)
})
it('spec Scenario "A failing decision service never disables AUTO from a main turn"', async () => {
 const h = await harness(json(401, { error: { message: 'SECRET-BODY' } }))
 await h.setMode('AUTO'); await h.run('Task'); await h.run('Next task')
 expect(h.jev.bodies).toHaveLength(0)
 const state = await h.invoke('state', { sessionId: h.agent.id })
 expect(state.mode).toBe('AUTO')
 expect(state.disabled).toBeUndefined()
 expect(JSON.stringify(state)).not.toContain('SECRET-BODY')
})
it('spec Scenario "Rating and exposure endpoints are gone"', async () => {
 const h = await harness(depth('baseline'))
 for (const operation of ['label', 'observe']) expect(h.routes.has(`/api/auto-model-routing.${operation}`), operation).toBe(false)
 expect([...h.routes.keys()].sort()).toEqual(['childRouting', 'decisionModels', 'saveSettings', 'setKey', 'setMode', 'settings', 'state', 'testDecision'].map(op => `/api/auto-model-routing.${op}`))
})
it('spec Scenario "Existing local ledgers are left untouched"', async () => {
 const h = await harness(depth('baseline'), { answer: () => 'reply' })
 const dir = join(h.home, 'state/auto-model-routing')
 mkdirSync(dir, { recursive: true })
 const judgements = join(dir, 'judgements.jsonl'), feedback = join(dir, 'allocation-feedback.jsonl')
 const oldJudgements = '{"sessionId":"a","turn":1,"tier":"simple","model":"m","rubricVersion":"x"}\n'
 const oldFeedback = [
  JSON.stringify({ sessionId: h.agent.id, messageId: 'm0', decisionId: 77, depth: 'baseline', model: 'claude-opus-5-5', effort: 'medium', boundAt: 4 }),
  JSON.stringify({ type: 'feedback', sessionId: h.agent.id, messageId: 'm0', decisionId: 77, at: 5, feedback: 'appropriate' }),
  JSON.stringify({ type: 'fact', sessionId: h.agent.id, decisionId: 77, fact: 'manual-switch', at: 6 }),
 ].join('\n') + '\n'
 writeFileSync(judgements, oldJudgements); writeFileSync(feedback, oldFeedback)
 await h.restart()
 await h.setMode('AUTO'); await h.run('first'); await h.setMode('MANUAL'); await h.run('second'); await h.setMode('AUTO')
 expect(lastAssistantId(h)).toBeTruthy()
 expect(readFileSync(judgements, 'utf8')).toBe(oldJudgements)
 expect(readFileSync(feedback, 'utf8')).toBe(oldFeedback)
})
it('spec Scenario "A fresh install writes no feedback ledger"', async () => {
 const h = await harness(depth('baseline'), { answer: () => 'reply' })
 await h.setMode('AUTO'); await h.run('first'); await h.setMode('MANUAL')
 expect(existsSync(join(h.home, 'state/auto-model-routing/allocation-feedback.jsonl'))).toBe(false)
})
it('spec Scenario "Old session state with a disabled reason stays readable and AUTO clears it"', async () => {
 const h = await harness(depth('baseline'))
 const { FileStateStore } = await import('../src/state.js')
 new FileStateStore(join(h.home, 'state/auto-model-routing/sessions')).set(h.agent.id, { mode: 'MANUAL', previous: 'standard', disabled: { category: 'unauthorized', at: 5 } })
 expect(await h.invoke('state', { sessionId: h.agent.id })).toMatchObject({ mode: 'MANUAL', disabled: { category: 'unauthorized', at: 5 } })
 await h.setMode('AUTO')
 const state = await h.invoke('state', { sessionId: h.agent.id })
 expect(state).toMatchObject({ mode: 'AUTO' }); expect(state.disabled).toBeUndefined()
})
it('toast_switch_default_on_only_false_is_off', async () => {
 const h = await harness(depth('higher', { confidence: 0.9 }))
 await h.setMode('AUTO')
 // Missing file: on by default.
 expect(await h.invoke('state', { sessionId: h.agent.id })).toMatchObject({ decisionToast: true })
 const dir = join(h.home, 'plugins/dsh-auto-model-routing'); mkdirSync(dir, { recursive: true })
 for (const body of ['{not json', JSON.stringify({ decisionToast: 'no' }), JSON.stringify(null), '{}']) {
  writeFileSync(join(dir, 'config.json'), body)
  expect((await h.invoke('state', { sessionId: h.agent.id })).decisionToast).toBe(true)
 }
 h.toast(false)
 expect(await h.invoke('state', { sessionId: h.agent.id })).not.toHaveProperty('decisionToast')
})
it('spec Scenario "New sessions start in the default mode"', async () => {
 const h = await harness(depth('lower'), { defaultAuto: true })
 expect(await h.invoke('state', { sessionId: h.agent.id })).toMatchObject({ mode: 'AUTO' })
 await h.run('one')
 expect(h.jev.bodies).toHaveLength(0)
 await closeHarness()
 const unsupported = await harness(depth('lower'), { defaultAuto: true, model: 'deepseek-v4.1-flash' })
 expect(await unsupported.invoke('state', { sessionId: unsupported.agent.id })).toMatchObject({ mode: 'MANUAL' })
 const child = await unsupported.ctx.agents.create({ sessionId: SessionId(`child-${Math.random()}`), meta: { origin: 'subagent' }, agentOptions: { provider: 'test', model: 'claude-opus-5-5' } })
 // S2 (unsupported default model) and C1 (a child) produce no state file at all.
 try { expect(existsSync(join(unsupported.home, 'state/auto-model-routing/sessions'))).toBe(false) } finally { await child.dispose() }
 await closeHarness()
 // S0: an existing session with no recorded mode is announced as resumed (not freshly created): it stays MANUAL.
 const resumed = await harness(depth('lower'), { defaultAuto: true, seed: [] })
 await resumed.ctx.serial('agent/created', { agent: resumed.agent, source: 'resume' })
 expect(await resumed.invoke('state', { sessionId: resumed.agent.id })).toMatchObject({ mode: 'MANUAL' })
})
it('new_session_default_auto_does_not_reapply_after_plugin_restart', async () => {
 const h = await harness(depth('lower'), { defaultAuto:true })
 expect(await h.invoke('state',{sessionId:h.agent.id})).toMatchObject({mode:'AUTO'})
 await h.setMode('MANUAL'); await h.restart()
 expect(await h.invoke('state',{sessionId:h.agent.id})).toMatchObject({mode:'MANUAL'})
})
it('host_routes_and_rpc_envelope', async () => {
 const h = await harness(depth('lower'))
 const rpc = await h.invoke('state', { type: 'client-request', rpcId: 'probe-1', method: 'auto-model-routing.state', payload: { sessionId: h.agent.id } })
 expect(rpc).toMatchObject({ type: 'server-response', rpcId: 'probe-1', result: { ok: true } })
})

it('empty_seed_is_not_a_fresh_auto_session', async () => {
 const h = await harness(depth('lower'), { defaultAuto:true, seed:[] })
 expect(await h.invoke('state',{sessionId:h.agent.id})).toMatchObject({mode:'MANUAL'})
 await h.run('one')
 expect(h.jev.bodies).toHaveLength(0)
})

it('default_auto_ignores_resume_clear_compact_and_subagents', async () => {
 const h = await harness(depth('lower'), { defaultAuto:true })
 await h.setMode('MANUAL')
 for (const source of ['resume','clear','compact'] as const) {
  await h.ctx.serial('agent/created', { agent:h.agent, source })
  expect(await h.invoke('state',{sessionId:h.agent.id})).toMatchObject({mode:'MANUAL'})
 }
 const child=await h.ctx.agents.create({sessionId:SessionId(`child-${Math.random()}`),meta:{origin:'subagent'},agentOptions:{provider:'test',model:'claude-opus-5-5'}})
 try {
  const stateFiles=join(h.home,'state/auto-model-routing/sessions')
  expect(readdirSync(stateFiles)).toHaveLength(1)
 } finally { await child.dispose() }
})
it('spec Scenario "MANUAL requests pass through unchanged"', async () => {
 const h = await harness(depth('higher'))
 await h.run('manual')
 expect(h.calls.at(-1)).toMatchObject({ provider: 'test', model: 'claude-opus-5-5', reasoningEffort: 'medium' })
 expect(h.jev.bodies).toHaveLength(0)
})
it('spec Scenario "Changing the default mode does not affect existing sessions"', async () => {
 const h = await harness(depth('lower'), { defaultAuto: true })
 expect(await h.invoke('state', { sessionId: h.agent.id })).toMatchObject({ mode: 'AUTO' })
 await h.setMode('MANUAL')
 await h.invoke('saveSettings', { defaultMode: 'MANUAL' }); await h.invoke('saveSettings', { defaultMode: 'AUTO' })
 await h.restart()
 expect(await h.invoke('state', { sessionId: h.agent.id })).toMatchObject({ mode: 'MANUAL' })
 const s2 = await h.ctx.agents.create({ sessionId: SessionId(`s2-${Math.random()}`), agentOptions: { provider: 'test', model: 'claude-opus-5-5' } })
 try {
  const { FileStateStore } = await import('../src/state.js')
  expect(new FileStateStore(join(h.home, 'state/auto-model-routing/sessions')).get(s2.agent.id)).toMatchObject({ mode: 'AUTO' })
 } finally { await s2.dispose() }
})
