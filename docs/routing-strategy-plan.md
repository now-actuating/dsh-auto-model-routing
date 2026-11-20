# AUTO routing strategy and roadmap (revised)

Date: 2026-10-24. Status: Design draft with responsibilities agreed; specific rules and host integration still need verification. This is not an implementation or deployment record and does not change the current specification or runtime behavior.

## 1. Core roles

Respect the agent's authority to organize work. AUTO fills the gap between resource selection and actual application; Jev makes fast judgements according to a defined strategy. First decide what a correct decision looks like, then design the questions, and only then optimize judgement performance. Jev's ability to support four tiers does not mean the strategy must use four tiers.

| Owner | Responsible for | Not responsible for |
|---|---|---|
| Main Agent / Team Lead | Understanding the goal, deciding whether to delegate, decomposing tasks, choosing how to collaborate, defining acceptance, integrating results, and handling failures | Selecting resources through interfaces that have no model parameters |
| AUTO | Independently selecting main-session effort and subtask model and effort, enforcing deterministic constraints, and applying choices on supported host paths | Reimplementing team scheduling, messaging, or task boards, or replacing main-model acceptance |
| Jev | Judging the capability and reasoning investment the current work requires under the defined strategy | Setting goal trade-offs, decomposing the entire project, or declaring success before execution |
| Host integration and deterministic code | Model catalog and allowlist, explicit selection precedence, mapping, decision binding, and actual request verification | Treating a recommendation as an applied result |

## 2. Scope and invariants

- Keep the user-selected provider/model in the main session; adjust only effort.
- Use lighter workers for suitable work, but do not downgrade every subtask. Complex investigations and independent reviews may use stronger models.
- Do not change MANUAL inheritance or selection. Per the user's scope decision, exclude dsh-plugin-subscriptions this round: do not investigate or modify it, and do not make its cache experiments a prerequisite. This scope decision does not imply that the adapter technically runs only in MANUAL.
- Do not replace Jev, introduce multiple classifiers, change the underlying cache protocol, or automatically publish or deploy.
- Preserve same-turn stability and explicit user constraints. If Jev fails, keep the existing visible exit/pause contract rather than silently downgrading.
- Treat cache effects as an evaluation limitation. Do not promise that a fixed model or a change in effort preserves the cache.
- Discussing Teams support does not authorize starting a team.

## 3. Draft strategy

### 3.1 Let the agent organize the work

Consider delegation when a task can be described, executed, and accepted independently and parallelism or context isolation outweighs the handoff and review cost. Keep small fixes and discussion tightly coupled to the current context in the main thread. Do not add a separate Jev classifier for whether to form a team.

### 3.2 Main-session effort

Use the official recommended starting point as the default reference and adjust for the cognitive work at hand, not the size of the whole project. Lower effort for clearly light reasoning; raise it for complex trade-offs, causal analysis, or conflicting results. Do not force an offset when evidence is insufficient. Keep effort stable within a turn. Define tiers, mappings, and unknown input handling in the later decision contract. Do not introduce escalation-only or fixed cooldown state machines yet.

### 3.3 Separate child-model capability and effort

First choose a model reasonably capable of doing the work, then decide how much reasoning to invest. Test lighter models at their official recommended effort before making any further reduction; do not lower effort again automatically. The easier the result is to verify, the more readily a lighter model can be tried. Control risk with permissions, acceptance, and confirmation rather than treating it as reasoning difficulty.

- Clear execution with mature procedures and directly verifiable results: prefer a lightweight model.
- Bounded work that still requires exploration and inference: select a sufficiently capable model.
- High ambiguity, multi-step inference, difficult debugging, or independent review: allow a strong model.

This is not a new three-tier rubric, nor does it imply two Jev calls. Design output dimensions and request count separately.

### 3.4 Acceptance and escalation

The main model accepts results based on execution evidence. Clarify an unclear brief first, add missing context first, consider more effort for skipped verification or a superficial attempt, and consider a stronger child model if a thorough attempt still fails. Do not treat network errors or rate limiting as insufficient capability. Escalation has a budget and stopping conditions; set the exact limits when confirming the rules. Do not use initial classification to assert success automatically.

## 4. What each creation path actually supports

This table is based only on the tool schemas exposed in the current session. It does not cover all host versions or establish that extension points have been found:

| Path | Current creation interface | Is recommending and then passing parameters enough? | What still needs verification |
|---|---|---|---|
| subagent | Exposes provider/model/reasoning_effort | Expressible through the interface, but actual application needs verification | Parameter passing, explicit selection precedence, actual request configuration |
| subagent_fork | Does not expose those parameters | No | Official extension points for creation/first request, inheritance and prefix restrictions |
| spawn_teammate | Does not expose those parameters | No | Official extension points, binding tasks to teammates, first-request configuration |

AUTO's main contribution is heterogeneous execution on paths that currently default to inheritance, not making the main agent repeat a choice it can already express. Being able to delegate does not mean the creation interface lets the agent select resources.

Do not claim Teams/fork coverage just because route_subagent returns a recommendation. Mark paths with no reliable integration point as unsupported, and do not silently bypass user constraints. Design initial selection for long-lived teammates separately from reselection when they take on a new task. The first version does not reroute every message by default.

## 5. Strategy examples

| Scenario | How to organize it | Resource strategy and rationale |
|---|---|---|
| One-line change with full context | Main model does it directly | Handoff costs outweigh the benefit; lighter reasoning may justify lower effort |
| Batch migration with clear rules and tests | Agent creates independent tasks | Lightweight workers at recommended effort; volume does not imply higher capability requirements |
| Extract clearly specified fields with citations | Independent subtask | Prefer lightweight; main model verifies sources and format |
| Causal judgement across conflicting sources | Independent investigation or main model | Use a sufficiently strong model and raise effort as depth warrants |
| Cross-module bug with unknown cause | Main model organizes the investigation | Do not downgrade by default; the agent decides which hypotheses to explore in parallel |
| Independent review after a complex implementation | Independent reviewer | Prioritize review capability; do not downgrade merely because it is a subtask |
| Integration of multiple results | Main model | Judge conflict and integration difficulty, not the total difficulty of the project |
| Simple action with serious consequences | Main model controls permissions and acceptance | Risk does not map directly to high effort |

## 6. Revised roadmap

1. **Finalize the strategy**: Use these examples and counterexamples to confirm delegation boundaries, model capability, effort, unknown cases, and escalation rules. Do not start by changing the rubric.
2. **Define the Jev decision contract**: Specify inputs, questions, outputs, insufficient-input handling, and deterministic mappings separately for main sessions and subtasks. The main turn can rely only on signals available before that turn's reasoning. Subtasks can use the goal, scope, output, and acceptance criteria the main model has already written down.
3. **Verify host capability**: Inspect the official extension points for all three creation paths read-only, and identify supported paths and implementation boundaries. This can run alongside strategy refinement, but host interfaces must not dictate the strategy.
4. **Create a separate OpenSpec change**: Propose the agreed strategy, integration scope, and acceptance conditions separately from the existing release change, then implement it.
5. **Implement and verify in layers**: Start with offline contract and routing integration tests, then compare a small set of real tasks under an explicit budget. Verify actual model and effort, not just the recommendation.
6. **Use the evidence to decide whether to roll out**: Preserve rollback and original inheritance behavior. Do not replace the default strategy unless acceptance passes.

## 7. Verify three things separately

- **Strategy quality**: If the strategy is always executed correctly, does it improve final task quality, total usage, and elapsed time? Keep an independent task set and include acceptance and retry costs.
- **Jev fidelity**: Does it make the expected judgement under the agreed strategy? Measure error types, stability, classification cost, and latency separately. Fast judgements are not evidence of a sound strategy.
- **Integration correctness**: Does every supported creation path actually use the selected model/effort? Do MANUAL, explicit selections, same-turn stability, failures, and unsupported paths follow the contract?

Jev matters for more than user experience and performance; misclassification can hurt quality. Agreement on Jev labels is not a substitute for strategy quality, and a recommendation is not a substitute for verified integration.

## 8. References and current specification

- [Core requirements and gaps](routing-intent-and-gaps.md)
- [External research](routing-community-research-2026-10-24.md): Historical recommendations; this revision sets implementation priorities.
- [Current specification](https://github.com/prgrmrwy/ohmydsh/blob/main/openspec/specs/auto-model-routing/spec.md): Still describes current behavior; this draft does not silently replace it.
- [Claude Code model configuration](https://code.claude.com/docs/en/model-config.md): opusplan uses Opus for planning and Sonnet for execution. It does not mean a fixed strong main model supervises a lightweight child.
- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents.md): The main model delegates based on role descriptions.
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams.md): The lead organizes shared tasks and collaboration; this does not inherently guarantee heterogeneous models or lower cost.
