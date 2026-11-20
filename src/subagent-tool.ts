import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Settings, RoutingCatalog } from './settings-contract.js'
import type { JevClient } from './jev.js'
import { buildState } from './context.js'
import type { RoutingState } from './state.js'
import { chooseChildRoute } from './routing.js'
import { registry as builtin, type Registry } from './strategies/index.js'
import { resolvePreset } from './presets/index.js'

interface SessionLike { id: string; session: { header: { origin?: string; parentSession?: string }; requestHeader?: () => { config?: { provider?: string; model?: string; reasoningEffort?: string } } | undefined }; options?: { provider?: string; model?: string; reasoningEffort?: string } }
export interface ToolDeps {
  /** Live agent registry (`ctx.agents`); used to walk a child up to its root session. */
  agents: { get(id: string): SessionLike | undefined }
  state: RoutingState
  readSettings: () => Settings
  catalog: (provider?: string) => RoutingCatalog | Promise<RoutingCatalog>
  registry?: Registry
}

/** The ordinary session a caller belongs to; undefined when any link is no longer live (treated as MANUAL). */
function rootOf(caller: SessionLike | undefined, agents: ToolDeps['agents']): SessionLike | undefined {
  let current = caller
  for (let depth = 0; current && depth < 32; depth++) {
    if (current.session.header.origin !== 'subagent') return current
    const parent = current.session.header.parentSession
    current = parent ? agents.get(parent) : undefined
  }
  return undefined
}

const MANUAL_TEXT = 'The main session is in MANUAL: delegate using the official defaults without a routing judgment. Only pass values specified by the user or lead (such as a specified model); omit any other provider, model, or reasoning_effort.'

/** Preview only: the same Jev judgment AUTO uses, while the root session is AUTO. Writes no state. */
export function routeSubagentTool(jev: JevClient, deps: ToolDeps) {
  const registry = deps.registry ?? builtin
  return defineTool({
    name: 'route_subagent',
    description: 'Optional preview of the AUTO sub-agent route: returns a recommendation only, never an applied route. Automatic routing happens when the official fresh creation tool creates the exact child, before its first request; use that tool directly and do not turn this recommendation into an explicit user constraint. Fork copies the parent and is not routed. Dispatch does not require calling this first. Sends the task text (redacted, up to 8000 characters) to the decision service chosen in settings only while the main session is AUTO; otherwise returns routed=false: delegate with the official defaults. If the user or lead already chose the model or effort, pass it: only the missing dimension is judged. status fallback: delegate with official defaults and tell the user why; needs-context: add goal and scope first; on error (including cancellation): pause delegation and ask the user; never guess or switch models.',
    timeoutMs: 10000,
    parameters: {
      task: { type: 'string', required: true, description: 'The task the sub-agent will do.' },
      provider: { type: 'string', required: true, description: 'Exact provider of the sub-agent (any provider; normally the current session’s).' },
      model: { type: 'string', description: 'Sub-agent model already chosen by the user or lead; when given, only reasoning_effort is judged.' },
      reasoning_effort: { type: 'string', description: 'Effort already chosen by the user or lead; preserved and validated, never silently replaced.' },
      path: { type: 'string', enum: ['ordinary','fork','teammate'], description: 'Creation path; fork is not routed.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          routed: { type: 'boolean' },
          status: { type: 'string' },
          capability: { type: 'string' },
          depth: { type: 'string' },
          reason: { type: 'string' },
          provider: { type: 'string' },
          model: { type: 'string' },
          reasoning_effort: { type: 'string' },
        },
      },
      render: (_args, v) => [{ type: 'text', text: v.status === 'recommended'
        ? `Recommended only (not applied): ${v.provider}/${v.model}/${v.reasoning_effort}. Use the official creation tool; AUTO judges and binds the exact child before its first request. Do not copy this recommendation as a new explicit user constraint. Query the child routing status for applied evidence.`
        : v.status === 'fallback' ? `fallback: ${v.reason}. Delegate using the official defaults and briefly explain why to the user.`
        : v.status === 'needs-context' ? `needs-context: ${v.reason}. Add the goal and scope before dispatching.`
        : v.status ? `${v.status}: ${v.reason}. A fork keeps the parent session settings; AUTO does not route it.`
        : MANUAL_TEXT }],
    },
    execute: async (args, exec) => {
      const root = rootOf(exec.agent as SessionLike | undefined, deps.agents)
      // MANUAL (or disabled, or an unreachable root): no judgement and nothing leaves the machine.
      if (!root || deps.state.read(root.id).mode !== 'AUTO') return { routed: false, reason: 'manual' }
      if (args.path === 'fork') return { routed: false, status: 'unsupported', reason: 'fork' }
      if (!args.provider) throw new Error('No provider specified; pause delegation and ask the user')
      const explicit = { ...(args.model ? { model: args.model } : {}), ...(args.reasoning_effort ? { reasoningEffort: args.reasoning_effort } : {}) }
      // The preview captures its own preset; a later fresh child captures independently.
      const preset = resolvePreset(deps.readSettings().preset)
      const result = explicit.model && explicit.reasoningEffort ? { kind: 'ok' as const, depth: 'baseline' as const, capability: 'bounded' as const }
        : await jev.judgePolicy(buildState({ text: args.task, execution: preset.context.includes('execution') ? 'delegated' : undefined }), exec.signal, 'child', explicit.model ? 'depth' : explicit.reasoningEffort ? 'capability' : 'both', preset)
      if (result.kind === 'cancelled' || exec.signal.aborted) throw new Error('Subtask judgment was cancelled; pause delegation and ask the user')
      if (result.kind === 'failed') return { routed: false, status: 'fallback', reason: `jev-${result.category}` }
      if (result.capability === 'insufficient_context') return { routed: false, status: 'needs-context', reason: 'Provide the task goal and scope' }
      const caller = exec.agent as SessionLike | undefined
      const config = caller?.session.requestHeader?.()?.config
      const parent = { model: config?.model ?? caller?.options?.model, reasoningEffort: config?.reasoningEffort ?? caller?.options?.reasoningEffort }
      const chosen = chooseChildRoute({ provider: args.provider, parent, explicit, capability: result.capability ?? 'bounded', depth: result.depth, catalog: await deps.catalog(args.provider), cap: deps.readSettings().effortCap }, registry)
      if ('fallback' in chosen) return { routed: false, status: 'fallback', reason: chosen.fallback }
      const route = chosen.route
      return { status: 'recommended', ...(result.capability ? { capability: result.capability } : {}), depth: result.depth, provider: route.provider, model: route.model, reasoning_effort: route.reasoningEffort }
    },
  })
}
