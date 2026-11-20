import { afterEach, expect, it } from 'vitest'
import { SessionId } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-api-session-controller'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { Context } from '@deepseek-ai/cordis'
import Agents, { installModelSelection } from '@deepseek-ai/dsh-agent'
import Sessions from '@deepseek-ai/dsh-session'
import Projections from '@deepseek-ai/dsh-session-projection'
import Prompt from '@deepseek-ai/dsh-system-prompt'
import Tools from '@deepseek-ai/dsh-tools'
import Llm, { LlmAdapter, createUserMessage, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'
import Loop from '@deepseek-ai/dsh-agent-loop'
import * as NativeExecutor from '@deepseek-ai/dsh-tool-executor-native'
import { createLaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as plugin from '../src/index.js'
import { fakeJev, json } from './fake-jev.js'

const stops: (() => Promise<void>)[] = []
afterEach(async () => { while (stops.length) await stops.pop()!() })

// Real plugin + real AgentLoop. The official selection is the agent's own model (DSH 0.2.2): a recorded pick, else the last request header.
async function harness() {
 const ctx = new Context()
 const jev = await fakeJev(json(200, { answers: { depth: { choice: 'higher' } } }))
 ctx.provide('launchEnvironment', createLaunchEnvironmentSnapshot([{ source: 'process', values: { OPENROUTER_API_KEY: 'sk-or-test' } }]) as never)
 for (const p of [Projections, Sessions, Agents, Prompt, Tools, Llm]) await ctx.plugin(p)
 await ctx.plugin(NativeExecutor) // 0.2.2: the loop needs a tool executor in the composition
 await ctx.plugin(Loop, { agents: [] })
 const calls: GenerateOptions[] = []
 class Adapter extends LlmAdapter {
  async resolveModel(provider: string, model: string) { return { provider, id: model, name: model, reasoning: { efforts: ['low', 'medium', 'high', 'xhigh', 'max'].map(id => ({ id: ReasoningEffortId(id), name: id })) } } }
  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> { calls.push(options); yield { type: 'finish', reason: { kind: 'stop' } } }
 }
 ctx.llm.registerAdapter(['test'], new Adapter())
 const routes = new Map<string, { fetch: (r: Request) => Promise<Response> }>()
 let current: Awaited<ReturnType<typeof ctx.agents.create>>['agent'] | undefined
 ctx.provide('connection', { fetch: { register(route: { path: string; fetch: (r: Request) => Promise<Response> }) { routes.set(route.path, route); return async () => { routes.delete(route.path) } } } } as never)
 // Like the official controller (0.2.2): selectModel records the selection on the agent's own model.
 ctx.provide('sessionController', {
  resolveAgent: async () => ({ agent: current }),
  selectModel: async (request: { provider: string; model: string; reasoningEffort?: string }) => {
   selections.push(request)
   const picked = { provider: request.provider, model: request.model, ...(request.reasoningEffort ? { reasoningEffort: ReasoningEffortId(request.reasoningEffort) } : {}) }
   current!.model.select(picked)
   return { selected: picked }
  },
 } as never)
 const home = mkdtempSync(`${tmpdir()}/router-sel-`)
 mkdirSync(`${home}/plugins/dsh-auto-model-routing`,{recursive:true})
 writeFileSync(`${home}/plugins/dsh-auto-model-routing/config.json`,'{}')
 const selections: unknown[] = []
 const fork = await ctx.plugin(plugin, { home, jevBase: jev.base })
 const handle = await ctx.agents.create({ sessionId: SessionId(`route-${Math.random()}`), agentOptions: { provider: 'test', model: 'claude-opus-5-5', reasoningEffort: ReasoningEffortId('medium') }, setup(agentCtx) { installModelSelection(agentCtx) } })
 const agent = handle.agent
 current = agent
 stops.push(async () => { await handle.dispose(); await fork.dispose(); await jev.close() })
 const call = async (op: string, body: unknown) => (await routes.get(`/api/auto-model-routing.${op}`)!.fetch(new Request('http://x/api', { method: 'POST', body: JSON.stringify(body) }))).json()
 const run = async (text: string) => { agent.followup(createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } })); await agent.whenIdle() }
 return { calls, run, jev, selections, sessionId: agent.id, setMode: (mode: 'AUTO' | 'MANUAL') => call('setMode', { sessionId: agent.id, mode }), pick: (effort: string) => agent.model.select({ provider: 'test', model: 'claude-opus-5-5', reasoningEffort: ReasoningEffortId(effort) }) }
}

it('spec Scenario "AUTO results synchronize to the official selection"', async () => {
 const h = await harness()
 await h.setMode('AUTO')
 await h.run('Investigate several modules')
 await h.run('Keep investigating')
 expect(h.calls.slice(-2).map(c => c.reasoningEffort)).toEqual(['high', 'high'])
 expect(h.selections).toEqual([{ sessionId: h.sessionId, provider: 'test', model: 'claude-opus-5-5', reasoningEffort: 'high' }])
})
it('spec Scenario "Switching to MANUAL does not restore the prior selection"', async () => {
 const h = await harness()
 await h.run('A routine question')
 // 0.2.2: a request header retires the matching pending selection itself (no controller consume step).
 await h.setMode('AUTO')
 await h.run('Investigate several modules')
 expect(h.calls.at(-1)?.reasoningEffort).toBe('high')
 await h.setMode('MANUAL')
 await h.run('Continue')
 await h.run('Continue again')
 // No restore: the official selection keeps high and MANUAL passes it through.
 expect(h.calls.slice(-2).map(c => c.reasoningEffort)).toEqual(['high', 'high'])
 expect(h.jev.bodies).toHaveLength(1)
})
it('spec Scenario "AUTO judgment overrides a pending manual selection"', async () => {
 const h = await harness()
 await h.setMode('AUTO')
 await h.run('Investigate several modules')
 // A pick made during AUTO is replaced by the next AUTO decision (synced to the official selection).
 h.pick('medium')
 await h.run('Investigate several modules')
 expect(h.calls.at(-1)?.reasoningEffort).toBe('high')
 expect(h.selections.at(-1)).toMatchObject({ reasoningEffort: 'high' })
 await h.setMode('MANUAL')
 await h.run('Continue')
 expect(h.calls.at(-1)?.reasoningEffort).toBe('high')
})
