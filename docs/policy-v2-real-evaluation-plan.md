# policy-v2 real-task comparison (plan; full comparison not run)

> Historical record: Names, paths, and behavior reflect the 0.4.x version at the time. From 0.5.0 onward, AUTO has one strategy, with rules in `src/rubric.json` and family strategies in `src/strategies/`.

## Purpose and prerequisites

The next step is not immediate deployment but validation of real child model quality, elapsed time, and total cost after fixes from independent review. The 10 existing Jev classification cases are not a task execution benchmark; their label hit rate is not a task success rate. Do not spend the remaining Jev authorization on other models. On 2026-10-25, the user authorized acceptance testing and local deployment with the minimum necessary subscription calls through the then-configured self-hosted gateway, without further dollar-budget approval. Minimal live acceptance is complete, but the full comparison is not. The acceptance record was removed from the release documentation in 0.6.6 and can be retrieved from git history.

## Confirmed execution path (2026-10-25)

The user specified the network constraints for this machine: OpenRouter is for Jev only. Actual child models initially run only through the then-configured self-hosted gateway, including its GPT and Claude models. Do not call local Claude, local codex/subscriptions, or OpenRouter for execution models.

The local cache showed gateway provider model IDs such as `claude/claude-haiku-5-5` and `codex/gpt-6-luna`. The cache establishes only what was previously discovered, not current availability or whether effort actually takes effect.

**Integration progress**: policy-v2 supports the gateway's exact provider/model pairs. Claude/GPT prefixes identify capability families. Other models must be explicitly selected, with `defaultEffort` read from the current catalog (if both dimensions are explicit, only validation is needed). If there is no automatic capability slot, stop; do not guess or fall back to a local route. The legacy catalog is unchanged. Bound child sessions still restore using the separate catalog after switching back to legacy. 190 tests and full host recovery through official tools with a fake adapter passed; no actual gateway model calls had been made at this stage. The gateway plugin is an already configured model entry point; neither its source nor its upstream is modified.

## Minimum viable comparison

- Fix one provider so the first round does not mix cross-provider and fork variables. Test only the official ordinary fresh path, with the main orchestration and acceptance role fixed.
- Compare the default legacy policy with explicit policy-v2. Run each once on the same 6 synthetic tasks with independent acceptance checks, for 12 initial child runs.
- Use 2 tasks in each of 3 categories: mechanical changes with deterministic validators, investigative fixes requiring root-cause diagnosis, and analyses requiring reasoning under constraints. Write fixtures, tests, and acceptance oracles first. Use half for development and freeze half as holdout; do not revise expectations based on results.
- Allow at most one rework attempt per run, explicitly decided by the main agent. Additional runs count toward the budget, for a maximum of 24 child runs. The router must not escalate or retry automatically, or silently switch models after failure.
- Resolve and confirm provider models and effort against the current official catalog and allowlist first. Report the fully qualified model IDs, not just aliases such as Haiku or Sol. Do not assume any real adapter is available or touch the subscriptions/MANUAL adapter.
- Confirm the exact model list, calls per model, input/output limits, and dollar or subscription limits with the user before running. If no official model entry point can bound costs, stop rather than creating a compatibility adapter.

## Metrics

For each task, record whether independent acceptance passed, whether it passed initially or eventually, why and how often it was reworked, classification latency and usage, total child execution and acceptance time, actual usage and cost when available, and infrastructure errors. Mark missing fields unknown, not 0. Subscription usage is not equivalent to dollar-denominated API pricing.

Compare total cost and elapsed time, including rework and acceptance, rather than just whether a lighter model was picked first. Use the small sample to uncover clear regressions, not to claim statistical optimality. Making the strategy the default requires separate approval.

## Out of scope

Deployment, release, live GUI verification, fork compatibility, transmission of real business data or session contents, expanding the provider adapter layer, and automated retries. After the comparison passes, request approval for a live single-session opt-in trial rather than enabling it globally by default.
