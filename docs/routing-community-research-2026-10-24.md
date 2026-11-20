# AUTO routing: Research on external approaches (2026-10-24)

Status: Read-only research; no implementation adopted. The main session cross-checked the findings, and a gpt-6.1-sol/high subagent conducted research. For the core requirements, see routing-intent-and-gaps.md.

## Three distinct types of automatic routing

1. Model/provider selection at a service gateway: Routes requests by capability and price. It may change the main model, so it does not inherently preserve this project's fixed main-model invariant.
2. Reasoning budget adjustment for a fixed model: Closest to how this project handles the main session, but it must account for cached prefixes, model support, and within-turn stability.
3. Delegation at the orchestration layer: Determines whether to dispatch work, what the task boundaries are, what capabilities and budget the worker needs, and how to verify results and escalate. A gateway classifier cannot make these decisions on behalf of the main Agent.

## Primary evidence reviewed

### Anthropic: A production example of a strong lead with lighter workers, but no guarantee of token savings

Source: https://www.anthropic.com/research/multi-agent-research-system

Anthropic's research system uses Opus 4 as the lead and Sonnet 4 as workers. It is suited to parallel research along independent lines and to compressing context. It emphasizes clear task objectives, output formats, boundaries, and tool guidance, as well as evaluation based on the final deliverable. The gains from this internal research evaluation cannot be generalized directly to all coding tasks. Multiple agents increase token consumption and are worthwhile only when the benefits justify the cost.

Direct retrieval of Anthropic's platform documentation on effort and caching encountered regional redirects during this review. The source summaries dated 2026-10-21/22 in the repository's [eval/README.md](../eval/README.md) are historical evidence, not a substitute for reviewing the full text this time.

### OpenAI: Changing effort can affect caching

Source: https://developers.openai.com/api/docs/guides/prompt-caching.md

The official documentation explains that reasoning.effort can change hidden model instructions. Supported GPT-6+ models can preserve the existing prefix by appending configuration_update while leaving the original top-level value unchanged. Whether this applies to the DSH subscription adapter requires a separate check of the actual protocol; it cannot be inferred directly from the API documentation.

### LiteLLM: Classification, runtime constraints, and shadow evaluation

Source: https://docs.litellm.ai/docs/auto_router
Source: https://docs.litellm.ai/docs/auto_router/evaluate

LiteLLM now has an Auto Router add-on and should no longer be categorized as load balancing only. Its most useful example is shadow evaluation: duplicate requests with identical inputs, evaluate the actual outputs blind, and compare multiple policies. The official documentation explicitly notes that matching the tier label does not mean the selected model answers well.

Cost accounting includes both classifier and downstream costs and tracks fallbacks and p95 latency. For follow-up turns, the comparison baseline should use a warm cache, and any new cache writes after switching should be deducted from the savings. Savings calculated against the most expensive configuration are still counterfactual estimates, not measured savings for this project.

### Magpie: Within-turn stability, cache-aware hysteresis, and optional effort updates

The project is https://github.com/yetone/magpie, not the dataset of the same name or merely a DSH connector.

Pinned source: https://github.com/yetone/magpie/tree/f3eb92924e56605860f6a85a3449247c26c0bd90

- internal/gateway/rules.go: Makes the decision at the start of a user turn and keeps it for subsequent tool results; exceptions such as context exceeding the model's capacity are handled separately. It retains higher effort while the cache is still warm rather than immediately stepping down for a simpler turn. It allows a decrease only after the cache cools or the context shrinks substantially.
- Pick and Wanted distinguish the tier actually retained from the tier desired by the new decision, making it easy to show when the recommendation differs from what takes effect.
- internal/gateway/effort_update.go: The preview is enabled only with MAGPIE_EFFORT_UPDATES=on and is off by default. It is limited to GPT-6, Responses, and OpenAI/ChatGPT accounts, and excludes certain server-managed history or automatic truncation paths.
- Raising effort above the initial base resets top-level effort. Comments claim that raising effort to a high tier via configuration_update resulted in insufficient actual reasoning. This is a reported upstream observation, not an official guarantee, and this project has not reproduced it.
- Update positions are stored and replayed per thread/account/model. A history mismatch, compaction, or a restart can require rebuilding the cache. Implementing this takes more than changing a single effort field.

What to adopt: Make main-session effort adjustments cache-aware, allow the judged tier and applied tier to differ, and require explicit support and capability checks for the cache update path. What not to copy: Enabling the preview by default, assuming it works across providers, or treating effort that can only increase across turns as optimal indefinitely.

## Additional verification by Sol: Official guidance

- https://claude.com/resources/articles/claude-model-and-effort-level-in-claude-code: The model sets the capability ceiling, while effort also affects file reading, tool use, verification, and persistence. Start with the model's default and treat effort as an overall preference. If the model is still wrong after a serious attempt, a stronger model may help; if it overlooks files, skips testing, or stops early, more effort may help.
- https://code.claude.com/docs/en/model-config.md: Opus, Sonnet, and Haiku 5.5 currently default to medium. Effort levels with the same name are not equivalent across models.
- https://code.claude.com/docs/en/prompt-caching.md: Most models use separate caches for different effort levels. Current Claude Code can preserve the cache for some model combinations using the direct API or subscriptions, but this does not apply to other backends or when beta features are disabled, for example. This capability depends on the client, backend, and model combination and does not automatically apply to DSH.
- https://developers.openai.com/api/docs/guides/model-selection.md: Compare models and effort levels with identical inputs and select the lightest configuration that meets the quality requirement.
- https://developers.openai.com/api/docs/guides/reasoning.md: Sol defaults to medium. High is suitable for complex debugging; xhigh needs evidence of gains from evaluation. Within each effort level, the model already adapts to the task.
- https://learn.chatgpt.com/docs/agent-configuration/subagents.md: The main thread owns requirements, decisions, and the final deliverable; child threads handle noisy exploration and summarize it. Sol suits ambiguous, multistep work, while Luna suits narrow, repeatable tasks. The guidance explicitly starts Luna at high and Astra at low. Subagents are not necessarily weaker.

## Community strategies and maintenance snapshot

At approximately 02:09–02:15 Asia/Shanghai on 2026-10-24, Sol consulted the GitHub REST repo and commits endpoints. Stars indicate interest only, and the last push or commit is not a measure of quality. All figures below are from that snapshot.

| Project | Interest and maintenance | Routing and limits |
|---|---|---|
| [Magpie](https://github.com/yetone/magpie) | 20,159 stars / 1,547 forks; HEAD f3eb929, committed 10/23 18:05Z; created 9/23, active but young, maintainers-only PRs | Closest to this project's turn-level classification and effort caching problems, but the gateway does not decompose tasks or verify results |
| [LiteLLM](https://github.com/BerriAI/litellm) | 61,909 / 12,608; HEAD 1e6dc81, committed 10/23 18:11Z | Large platform; Auto Router is still a beta add-on. Maps four tiers to models or pools using heuristics, an LLM, Jev, or local Laya. Supports context and modality constraints, stall escalation, and session pinning. Platform maturity does not establish the maturity of every routing policy |
| [RouteLLM](https://github.com/lm-sys/RouteLLM) | 5,633 / 446; HEAD 0b64fda, last push 2024-08-10 | Uses win rates and thresholds to route between a strong and a weak model; includes MF, Elo, and BERT approaches and emphasizes in-domain calibration. An influential research baseline, not an actively maintained product for new models; old static benchmarks are not evidence for long-horizon coding |
| [DSH Laya](https://github.com/HapyRain/dsh-router-laya) | 25 / 6; HEAD 29624e7, committed 10/17 | Local classifier of about 846 MB plus rules. By default adjusts low/high/max on the same Flash model and locks the setting within a turn; falls back to low on failure. The 99% label figure and unpublished experiments do not establish end-to-end gains |
| [Neptune810 router](https://github.com/Neptune810/dsh-model-router) | 2 / 3; HEAD 1d1968a, committed 10/04 | full/effort/model scopes, escalation on errors or repetition, and hysteresis for stepping down. Child preferCheap is not backed by quality evidence |
| [thedeveloper256 router](https://github.com/thedeveloper256/dsh-model-router) | 1 / 0; last push 9/20 | Role configuration for a root planner and child executor. Both currently default to Flash, and the README differs from the old description. Separating roles does not mean the lead is actually stronger than the workers |
| [incrhst router](https://github.com/incrhst/dsh-model-router) | 0 / 0; committed 8/31 | Thresholds on size/tool/code/keyword scores switch between Pro and Flash; images use vision. No closed-loop verification was observed |
| [superboy911 router](https://github.com/superboy911/dsh-model-router) | 4 / 1; last push 9/11 | Ordered keywords select a model and optionally effort; no match means no change. Deterministic rules, not learning-based AUTO |

There is not yet sufficient evidence that the DSH routing community has converged on a solution validated at scale. Repositories with the same name should not be conflated into a single popular project.

## Current OpenRouter Auto policy

Source: https://openrouter.ai/docs/guides/routing/routers/auto-router.md (read by Sol during this review)

A lightweight classifier currently assigns requests to about 30 task categories. Models are then ranked by their actual aggregate spend share for that category over the past 7 days, filtered by the cost_tier range, and selected along with fallbacks subject to allow/exclude/tool/modality/ZDR constraints. This is not the old NotDiamond approach. Market spend share is not a capability score, and cost_tier is neither reasoning effort nor a simple price cap. Session stickiness is conditional: the original model must still be among the top candidates for the new task. The constraints and transparency about the model actually used are worth adapting, but the approach cannot replace the fixed main-model policy as-is.

## Further observations from the Magpie source

- classify.go/decide.go: With ordinary small models, intent and effort can be classified in two parallel calls. Jev can answer multiple questions in one call. Effort scores 0..3 map to low/medium/high/xhigh, unlike this project's choice tier plus model offset.
- The normalized intent confidence threshold is 0.4. Low confidence in the level preserves the previous level. Results are cached for 10 minutes, in-flight requests are coalesced, and failures trigger a 30-second cooldown; the previous intent can be retained.
- The current context includes the first 3000 and last 1000 runes of the latest request and 1000 each from the previous turn's user message and reply. It does not include tool results or reasoning.
- https://usemagpie.ai/docs/intent is labeled v0.1.99 and still says only the latest message is considered and that group classifiers are unsupported. This differs from the code at the pinned commit, so the old documentation alone is not sufficient.
- smart/order/rotate/usage/pace largely deal with account availability and quotas; they should not all be described as routing for optimal quality.

## Recommended order for this project

1. **P0: Baselines for caching and outcomes.** Compare a fixed main model at its official default effort with main-effort-only, child-model-only, child-effort-only, and joint AUTO. Stratify by narrow implementation, exploration, debugging, and cross-system design. Judge by independent tests and final outcomes. Track total costs for the parent and children, classification, verification, retries, and caching, plus end-to-end latency and p95. Do not evaluate only the tier.
2. **P1: Separate capability from budget.** Keep a strong lead with lighter workers. Let the main model plan and verify; select child models based on the capabilities required and how readily the result can be verified, not just because a child should be cheap. Start by testing small models at their recommended effort; do not step down again without validation.
3. **P1: Cache-aware adjustments.** Verify what the current DSH wire protocol actually supports before choosing among per-turn updates, a more stable default, changes at natural task boundaries, or hysteresis that delays stepping down until cooldown or compaction. Do not copy Magpie's five-minute interval verbatim.
4. **P2: Verification and escalation.** Distinguish capability failures from 429s and timeouts. Add context, raise effort, or switch models based on the failure cause, with limits and stop conditions. The existing contract to exit AUTO or pause delegation on Jev failure must not be silently replaced with a low fallback.
5. **P2: Observability and shadow comparisons.** Show the judged tier and the applied configuration, along with caching, costs, and reasons for escalation. Real shadow outputs offer useful comparisons but cost extra. A recommendation or theoretical cost estimate is not an observed outcome.

No external projects were installed, no paid benchmarks were run, and no runtime configuration was changed. None of the external gain figures above were independently reproduced. Implementation still requires separate confirmation of the specification and acceptance criteria.
