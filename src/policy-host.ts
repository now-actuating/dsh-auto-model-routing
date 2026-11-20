import { AsyncLocalStorage } from 'node:async_hooks'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { JevClient, Depth, PolicyMeasure } from './jev.js'
import { CATEGORY_HINTS } from './jev.js'
import { chooseChildRoute, validatePolicyRoute } from './routing.js'
import { registry as builtin, type Registry } from './strategies/index.js'
import { PolicyStore, type ChildDecision } from './policy-store.js'
import type { RoutingState } from './state.js'
import type { RoutingCatalog, Settings } from './settings-contract.js'
import { buildState, redact } from './context.js'
import { isRecord } from './settings-validation.js'
import { currentMainSelection, mainSupported } from './support.js'
import { resolvePreset } from './presets/index.js'

/**
 * AUTO routes fresh children only. Main sessions are never judged and never rewritten: no decision call, no model selection,
 * so the main request keeps the user's choice (and its prompt cache) on every turn.
 */
export function policyHost(ctx: Context, deps: { jev: JevClient; state: RoutingState; store: PolicyStore; settings: () => Settings; catalog: (provider?: string) => Promise<RoutingCatalog>; registry?: Registry }) {
  const registry = deps.registry ?? builtin
  const delegation = new AsyncLocalStorage<{ parentId: string; rootId: string; path: ChildDecision['path']; explicit: { provider?: string; model?: string; reasoningEffort?: string }; prompt: string }>()
  const rootOf = (agent: Agent): Agent | undefined => {
    let current: Agent | undefined = agent
    for (let i = 0; current && i < 32; i++) {
      if (current.session.header.origin !== 'subagent') return current
      current = current.session.header.parentSession ? ctx.agents.get(current.session.header.parentSession) : undefined
    }
  }
  const epochs = new Map<string, number>()
  const epoch = (id: string) => epochs.get(id) ?? 0
  const enabled = (rootId: string) => deps.state.read(rootId).mode === 'AUTO'
  const pending = new Map<string, ChildDecision>()
  ctx.effect(() => () => { pending.clear(); delegation.disable() })
  /** In-memory decision view: the persisted child record shape plus the preset that made the judgement (never persisted in child records). */
  type Decision = NonNullable<ChildDecision['decision']> & { preset?: string }
  let decisionId = Date.now()
  /** Latest child decision per root session (memory only). */
  const latest = new Map<string, Decision>()
  /** Preset captured at each managed child's judgement, keyed by child id (memory only). */
  const childPreset = new Map<string, string>()
  /** Fall back to MANUAL when the main model left AUTO's registered families. */
  const lockUnsupportedMain = (agent: Agent) => {
    deps.state.setMode(agent.id, 'MANUAL')
    epochs.set(agent.id, epoch(agent.id) + 1)
    latest.delete(agent.id)
  }
  const childEpochs = new Map<string, number>()
  const notices = new Map<string, { id: number; childId: string; reason: string; at: number }>()
  let noticeId = 0
  /** Visible fallback: the child request runs with DSH defaults, the root learns why. */
  const fallback = (record: ChildDecision, reason: string): ChildDecision => {
    const next: ChildDecision = { childId: record.childId, parentId: record.parentId, rootId: record.rootId, path: record.path, explicit: record.explicit,
      ...(record.family ? { family: record.family } : {}), ...(record.parentSelection ? { parentSelection: record.parentSelection } : {}), status: 'unsupported', reason }
    deps.store.set(next)
    pending.delete(record.childId)
    childEpochs.delete(record.childId)
    notices.set(record.rootId, { id: ++noticeId, childId: record.childId, reason, at: Date.now() })
    ctx.logger.warn(`auto-model-routing: child ${record.childId} not routed (${reason}); running with DSH defaults`)
    return next
  }
  const capturedAllowlist = (parentId: string) => {
    const events: readonly { type: string; data: unknown }[] = ctx.agents.get(SessionId(parentId))?.session.snapshotEvents() ?? []
    const captured = events.find(event => event.type === 'subagent/model-selection-policy')
    if (!captured) return undefined
    const allowed = (captured.data as { allowedModels?: unknown }).allowedModels
    return Array.isArray(allowed) ? allowed as { provider: string; model: string }[] : []
  }
  ctx.on('tools/execute', async (exec, next) => {
    if (!['subagent','spawn_teammate'].includes(exec.name) || !exec.agent) return next()
    const args = isRecord(exec.arguments) ? exec.arguments : {}
    // Fork copies the parent: AUTO does not manage it and opens no binding window.
    if (exec.name === 'spawn_teammate' && args.context === 'fork') return next()
    const root = rootOf(exec.agent)
    if (!root || !enabled(root.id)) return next()
    // The main model left AUTO's registered families: lock to MANUAL and route nothing.
    if (!mainSupported(currentMainSelection(ctx, root), registry)) { lockUnsupportedMain(root); return next() }
    const explicit = { ...(typeof args.provider === 'string' && args.provider ? { provider: args.provider } : {}),
      ...(typeof args.model === 'string' ? { model: args.model } : {}),
      ...(typeof args.reasoning_effort === 'string' ? { reasoningEffort: args.reasoning_effort } : {}) }
    // The official tools' task text is `args.prompt`: the child's first user message, and the only input of its judgement.
    return delegation.run({ parentId: exec.agent.id, rootId: root.id, path: exec.name === 'spawn_teammate' ? 'teammate' : 'ordinary', explicit, prompt: typeof args.prompt === 'string' ? args.prompt : '' }, next)
  })
  /**
   * Managed child, `agent/created` (startup): bind, sample the parent, judge (awaited with the creation signal, before the first
   * message is delivered) and write the route into the child's own selection. DSH 0.2.2 fixes each step's selection at the start of the
   * step, so the route must already be the child's selection by then; nothing is saved as a global default.
   */
  const routeChild = async (agent: Agent, initial: ChildDecision, prompt: string, signal: AbortSignal) => {
    let record = initial
    const startedEpoch = childEpochs.get(agent.id) ?? epoch(record.rootId)
    const current = () => enabled(record.rootId) && epoch(record.rootId) === startedEpoch
    if (!current()) { fallback(record, 'mode-changed'); return }
    const explicit = record.explicit
    let measure: PolicyMeasure | undefined
    let capability: 'bounded' | 'analytical' | 'frontier' = 'bounded', depth: Depth = 'baseline'
    if (!explicit.model || !explicit.reasoningEffort) {
      // The exact child's first user message (the official tool's `prompt`), not a parent-history/prompt similarity match.
      const text = redact(prompt).slice(0, 8000)
      // Captured when this judgement starts.
      const preset = resolvePreset(deps.settings().preset)
      childPreset.set(agent.id, preset.id)
      const result = await deps.jev.judgePolicy(buildState({ text, execution: preset.context.includes('execution') ? 'delegated' : undefined }), signal, 'child', explicit.model ? 'depth' : explicit.reasoningEffort ? 'capability' : 'both', preset)
      if (!current()) { fallback(record, 'mode-changed'); return }
      if (result.kind === 'cancelled' || signal.aborted) { fallback(record, 'jev-cancelled'); return }
      if (result.kind === 'failed') { fallback(record, `jev-${result.category}`); return }
      if (result.capability === 'insufficient_context') { fallback(record, 'needs-context'); return }
      measure = result
      capability = result.capability ?? 'bounded'; depth = result.depth
    }
    const catalog = await deps.catalog(explicit.provider)
    if (!current()) { fallback(record, 'mode-changed'); return }
    if (signal.aborted) { fallback(record, 'jev-cancelled'); return }
    const parent = record.parentSelection ?? { provider: explicit.provider }
    const chosen = chooseChildRoute({ provider: explicit.provider, parent, explicit, capability, depth, catalog, cap: deps.settings().effortCap, captured: capturedAllowlist(record.parentId) }, registry)
    if ('fallback' in chosen) { fallback(record, chosen.fallback); return }
    const route = chosen.route
    record = { ...record, route, status: 'recommended', decision: { id: ++decisionId, source: 'subagent', tier: capability, depth, capability, effort: route.reasoningEffort, model: route.model, provider: route.provider, status: 'recommended', ms: measure?.ms ?? 0, decisionProvider: measure?.decisionProvider ?? 'explicit', decisionModel: measure?.decisionModel ?? 'not called', ...(measure?.confidence !== undefined ? { confidence: measure.confidence } : {}), ...(measure?.capabilityConfidence !== undefined ? { capabilityConfidence: measure.capabilityConfidence } : {}), ...(measure?.probabilities ? { probabilities: measure.probabilities } : {}), ...(measure?.capabilityProbabilities ? { capabilityProbabilities: measure.capabilityProbabilities } : {}) } }
    deps.store.set(record); pending.delete(agent.id); childEpochs.delete(agent.id)
    // The child's own selection (durable `model/selection`), never the session-controller path: no global default is written.
    agent.model.select(route as Parameters<typeof agent.model.select>[0])
  }
  /** Resume of a legacy-recorded route: 0.2.1 only rewrote the route per request, so a child interrupted before its first request resumes at the parent snapshot. */
  const restoreRoute = (agent: Agent) => {
    let record: ChildDecision | undefined
    // Missing, corrupt or mismatched records are left to the request gate, which fails closed on every attempt.
    try { record = deps.store.get(agent.id) } catch { return }
    if (!record?.route || record.status === 'failed' || record.parentId !== agent.session.header.parentSession) return
    const selected = agent.model.current()
    const route = record.route
    if (selected && selected.provider === route.provider && selected.model === route.model && selected.reasoningEffort === route.reasoningEffort) return
    agent.model.select(route as Parameters<typeof agent.model.select>[0])
  }
  ctx.on('agent/created', async ({ agent, source, signal }) => {
    if (agent.session.header.origin !== 'subagent') return
    if (source === 'resume') { restoreRoute(agent); return }
    if (source !== 'startup') return
    const binding = delegation.getStore()
    // shortcut: same-window plugin children under this parent are indistinguishable (accepted 2026-10-28), until DSH exposes tool-call→child identity.
    if (!binding || binding.parentId !== agent.session.header.parentSession || !enabled(binding.rootId) || deps.store.wasBound(agent.id)) return
    const parent = ctx.agents.get(SessionId(binding.parentId))
    if (!parent) return
    const config = parent.session.requestHeader()?.config
    const provider = config?.provider ?? parent.options.provider
    const model = config?.model ?? parent.options.model
    const effort = config?.reasoningEffort ?? parent.options.reasoningEffort
    const routeProvider = binding.explicit.provider ?? provider
    if (typeof provider !== 'string' || !provider || typeof routeProvider !== 'string' || !routeProvider) return
    const family = registry.familyOfMainModel(binding.explicit.model ?? (typeof model === 'string' ? model : undefined))?.id
    const record: ChildDecision = { childId: agent.id, parentId: binding.parentId, rootId: binding.rootId, path: binding.path, status: 'recommended',
      explicit: { ...binding.explicit, provider: routeProvider }, ...(family ? { family } : {}),
      parentSelection: { provider, ...(typeof model === 'string' ? { model } : {}), ...(typeof effort === 'string' ? { reasoningEffort: effort } : {}) } }
    deps.store.create(record)
    pending.set(agent.id, record)
    childEpochs.set(agent.id, epoch(binding.rootId))
    await routeChild(agent, record, binding.prompt, signal ?? new AbortController().signal)
  })
  const requireBindingRecord = (agent: Agent, record: ChildDecision | undefined) => {
    if (deps.store.wasBound(agent.id) && !record) throw new Error('The bound child session decision record is missing and cannot be restored; stop the request without reverting to inherited settings')
  }
  ctx.on('agent/disposed', ({ agent }) => { pending.delete(agent.id); childPreset.delete(agent.id); return undefined })
  ctx.on('agent/request', async (payload, next) => {
    const config = await next()
    const agent = payload.agent
    // Main sessions pass through untouched: AUTO never changes their request.
    if (agent.session.header.origin !== 'subagent') return config
    // Managed children: the route was written into the child's own selection at `agent/created`; this listener only verifies it,
    // on every attempt (retries included), and returns the request unchanged.
    const record = deps.store.get(agent.id)
    requireBindingRecord(agent, record)
    if (record && record.parentId !== agent.session.header.parentSession) throw new Error('Decision identity mismatch')
    if (record && !record.route && record.status === 'recommended' && !pending.has(agent.id)) { fallback(record, 'interrupted'); return config }
    if (!record?.route) return config
    if (record.status === 'failed') throw new Error('Failed to apply the route; pause the child request and ask the user')
    // Existing routed instances keep their initial route; live gates are re-checked on every request.
    validatePolicyRoute(await deps.catalog(record.route.provider), record.route.provider, record.route.model, record.route.reasoningEffort, deps.settings().effortCap, capturedAllowlist(record.parentId))
    if (config.provider !== record.route.provider || config.model !== record.route.model || config.reasoningEffort !== record.route.reasoningEffort) {
      const preset = childPreset.get(agent.id)
      if (record.decision) latest.set(record.rootId, { ...record.decision, status: 'failed', ...(preset && record.decision.decisionProvider !== 'explicit' ? { preset } : {}) })
      deps.store.set({ ...record, ...(record.decision ? { decision: { ...record.decision, status: 'failed' } } : {}), status: 'failed', reason: 'Actual request settings do not match the route' })
      throw new Error('Actual request settings do not match the route')
    }
    return config
  }, { prepend: true })
  ctx.on('session/event', (session, event) => {
    if (event.type !== 'request/header') return
    // Main sessions are never rewritten: only routed children are confirmed against their actual request.
    if (session.header.origin !== 'subagent') return
    const record = deps.store.get(session.id)
    if (!record?.route) return
    const actual = (event.data as { header?: { config?: { provider?: string; model?: string; reasoningEffort?: string } } }).header?.config
    if (!actual) return
    const matches = actual.provider === record.route.provider && actual.model === record.route.model && actual.reasoningEffort === record.route.reasoningEffort
    const preset = childPreset.get(session.id)
    if (record.decision) latest.set(record.rootId, { ...record.decision, status: matches ? 'applied' : 'failed', ...(preset && record.decision.decisionProvider !== 'explicit' ? { preset } : {}) })
    deps.store.set({ ...record, ...(record.decision ? { decision: { ...record.decision, status: matches ? 'applied' : 'failed' } } : {}), status: matches ? 'applied' : 'failed', ...(matches ? { actual: record.route } : { reason: 'Actual request settings do not match the route' }) })
    if (!matches) throw new Error('Actual request settings do not match the route')
  })
  return {
    invalidate: (id: string) => { epochs.set(id, epoch(id) + 1); latest.delete(id) },
    childNotice: (rootId: string) => notices.get(rootId),
    status: (id: string) => deps.store.get(id),
    /** The root's latest child decision (AUTO only); the main session itself has no decision. */
    latestDecision: (id: string) => enabled(id) ? latest.get(id) : undefined,
  }
}
