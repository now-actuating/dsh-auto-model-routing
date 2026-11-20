# AUTO routing: Core requirements and remaining gaps

Recorded on 2026-10-24 (Asia/Shanghai). Status: Requirements review and research, not an approved implementation plan. This does not change the current operating specification, the 0.3.0 default behavior, or production configuration.

## Core user requirements (acceptance goals for future proposals)

1. Routing decisions and configuration should follow Anthropic and OpenAI's official guidance on model-specific use cases, effort, delegation, and cost optimization. Distinguish officially supported capabilities, official recommendations, and policies based on this project's experience. Do not call the custom four-tier table an official standard.
2. Keep the user-selected provider/model in the main session and adjust only effort. Reasons for retaining the main model include continuity of behavior and context and less disruption to caching. An effort change is not guaranteed to preserve the cache; verify this against the actual adapter.
3. A strong main model handles understanding, decomposition, coordination, and verification. Delegate suitable execution tasks to lighter child models. Do not simply revert to having all child sessions use the strong main model by default because cross-model evaluation is lacking, and do not delegate every small task either.
4. AUTO aims to balance quality, speed, and total cost rather than always using the highest or lowest configuration. Total cost includes classification, handing off context, worker execution, verification by the main model, and retries after failure.
5. The user recalls asking for the main model to let simpler child models do the work. The current environment-level instructions do provide guidance on when to delegate, but do not mandate delegating every simple task. Future work should clarify when to delegate in a way that also applies to the standalone plugin.

## Current evidence

- Current specification: [Main repository specification](https://github.com/prgrmrwy/ohmydsh/blob/main/openspec/specs/auto-model-routing/spec.md) (this section is a historical research snapshot and does not describe the current default policy). It specifies a fixed main model, a shared four-tier rubric, childRoutes, and dispatch rules.
- Default starting points and offsets for the main model: [effort.ts](../src/effort.ts). The Claude child table uses Haiku/Sonnet/Opus/Opus; the GPT child table uses Luna/Sol/Sol/Sol.
- Subagent tool: [subagent-tool.ts](../src/subagent-tool.ts). It judges child tasks separately, adjusts only effort when a model is specified, and validates directories and the allowlist.
- In-package guidance: [SKILL.md](../skills/subagent-model-routing/SKILL.md) mainly governs model selection, invocation, and reuse. Guidance on when to dispatch resides mainly in the [main repository's environment instructions](https://github.com/prgrmrwy/ohmydsh/blob/main/instructions/dsh-home.md), which are optional context, not a requirement for loading the plugin. Historical commit 14d68627 (2026-10-22) explicitly added rules to dispatch larger coding tasks, independent reviews, extensive exploration, and work that can proceed in parallel, and not to dispatch small fixes or discussions. This confirms that the delegation requirement the user recalls was implemented, but delegation was not mandatory for every simple task.
- Sources and evaluation scope: [eval/README.md](../eval/README.md). The existing regression suite measures tier consistency, not final task quality, speed, or cost.

## Gaps and recommendations (pending research and calibration, not authorization to implement)

| Gap | Impact | Recommendation and validation |
|---|---|---|
| The same difficulty label determines both the model capability tier and effort | A `simple` task may be assigned both a smaller model and low effort. The fact that a strong model does it easily does not imply a small model does it reliably on a low budget | Keep lightweight workers. Separate capability matching from reasoning budget, start from the selected model's official recommendation, and validate offsets. Do not rush to add a second network call for classification |
| Keeping the model fixed is mistaken for a guarantee that the cache is preserved | Top-level Claude effort may affect the prefix. Savings on output can be offset by new cache writes | Check the current Claude/GPT adapters and official documentation. Record cache reads, writes, and total latency, and compare stable effort with per-turn effort |
| No cost threshold for when delegation is worthwhile | Dispatching a one-line task may be slower and more expensive than having the main model do it directly | The main Agent should decide whether to dispatch based on task independence, workload, handoff cost, and verifiability. Do not require delegation just because a task is `simple` |
| Standalone plugin guidance does not fully match personal environment guidance | Installing the tool or skill does not ensure users actually get a strong lead with lighter workers | Specify minimal in-package dispatch and verification guidance and the limits of best-effort behavior. Verify on the actual Host and do not claim it can enforce the rules by intercepting calls |
| No closed loop for verifying outcomes and escalating quality failures | A weak configuration may keep retrying and ultimately cost more | Distinguish tool/network failures from reasoning failures. Define acceptance criteria, bounded retries, and when to escalate capabilities, while respecting the user's fixed-model constraint |
| The boundary between official recommendations and experience-based configurations is unclear | The default table can become outdated as models change, and users may mistake it for an official guarantee | Maintain versioned sources, applicable tasks, supported effort levels, and recommended starting points. Explicitly label internally derived settings as presets pending evaluation |
| No evidence of end-to-end gains | Classification accuracy does not imply task success or cost savings | Compare fixed high settings, fixed recommended settings, current AUTO, and candidate AUTO on the same tasks. Record independent pass rates, end-to-end time and cost, and retry counts |

## Revised priorities and division of responsibilities

Follow the [strategy and rollout plan](routing-strategy-plan.md) subsequently confirmed by the user:

1. Define how routing should work first, then explain the decision criteria clearly to Jev. Do not let the existing four-tier output dictate the policy.
2. The Agent retains responsibility for decomposition, dispatch, collaboration, and verification. AUTO selects resources and applies the selection. Jev makes bounded judgments about capability and depth.
3. Separate child-model capability from effort and retain a strong lead with lighter workers. Do not automatically lower effort again because the model is lighter.
4. Close the gap between creation paths: subagent currently exposes model and effort parameters, while fork/teammate do not. Returning a recommendation does not mean routing succeeded. Check the official integration points and verify the actual requests. Do not assume that letting the main Agent choose is a viable alternative on every path.
5. Verify policy quality, the fidelity of Jev's judgments, and the correctness of host integration separately.

As agreed with the user, this round excludes changes to dsh-plugin-subscriptions and MANUAL. Cache and adapter experiments are no longer prerequisites. The caching material in the table above and the section below remains as historical evidence and evaluation limitations. It is not an implementation requirement for this round and does not claim that fixing the model necessarily preserves the cache. This scope agreement does not mean that subscription adapters technically run only in MANUAL.

## Independently verified caching evidence

- [OpenAI Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching.md) (read 2026-10-24): Request-level reasoning.effort can change model-side instructions. Supported GPT-6+ models preserve the earlier prefix by appending configuration_update and leaving the original top-level value unchanged. This is an API capability and does not prove that the current DSH/subscription adapter supports it.
- [Magpie rules.go](https://github.com/yetone/magpie/blob/main/internal/gateway/rules.go) (read 2026-10-24 from main, a mutable reference): The decision is retained within a turn. keepsEffort prevents lowering effort while the cache is still warm but allows increases. It allows decreases when the cache becomes too cold or the context shrinks to less than half its previous size. Pick and Wanted are distinct, and comments say that paths supporting effort updates can use Wanted. Cache-hit observations in the project comments are upstream self-reports and have not been reproduced by this project. The caching policy is worth adapting, but cannot be copied as a universal rule for all providers. Sol's later review of pinned commit f3eb92924e56605860f6a85a3449247c26c0bd90 found that the update path in effort_update.go is a preview explicitly enabled by MAGPIE_EFFORT_UPDATES=on. It is off by default and limited to GPT-6, OpenAI or ChatGPT accounts, and Responses. The presence of takesEffortUpdates in the source does not mean all deployments preserve the cache by default.

## Where official guidance on strong leads and lighter workers applies

[Anthropic's multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system) (full text read on 2026-10-24) describes an Opus 4 lead with Sonnet 4 workers outperforming a single Opus 4 in Anthropic's internal research evaluation. That result applies to a specific research system: it neither demonstrates gains for this project nor shows that multi-agent setups suit all coding tasks. The article emphasizes running independent lines of work in parallel, compressing context, setting clear task boundaries, and evaluating final outcomes. It also notes that multiple agents substantially increase token use and that coding tasks are often harder to parallelize than research. Adopt its orchestration and verification principles rather than copying older model combinations or gain percentages directly.

## External research

The gpt-6.1-sol/high subagent researched official guidance, well-maintained or popular community routers, and yetone/magpie's policy. The main session cross-checked OpenAI caching, Anthropic research orchestration, LiteLLM evaluation, and Magpie's update path. See the [research notes](routing-community-research-2026-10-24.md) for details. The findings distinguish official documentation, facts established by the code, statements from projects, and unreproduced claims about results. Popularity does not establish effectiveness, and research recommendations are not incorporated directly into the current specification.
