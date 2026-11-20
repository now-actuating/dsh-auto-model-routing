# Jev policy-v2 validation (2026-10-24)

> Historical record: Names, paths, and behavior reflect the 0.4.x version at the time. From 0.5.0 onward, AUTO has one strategy, with rules in `src/rubric.json` and family strategies in `src/strategies/`.

## Conclusion

The official interface and the live `typesafe/jev-1.13` model both support returning independent capability and depth answers in one request. All 10 synthetic requests returned two valid Choice answers. The 5 predefined cases in each of the development and holdout splits matched expectations, without rubric changes or retries. **This validates only the interface and small-sample classification, not actual child model quality, cost benefits, or readiness to make the strategy the default.**

- [Official tutorial](https://openrouter.ai/docs/guides/community/jev-tutorial.md): Questions are answered in parallel and cannot see each other’s answers.
- [Official API schema](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md): `questions` is a map of named questions; `answers` uses the same keys.
- [Pricing endpoint](https://openrouter.ai/api/v1/models/typesafe/jev-1.13/endpoints): At validation time, input cost US$0.042 per million tokens and output cost 0; requests explicitly set `max_price` and disallowed fallback.
- The model remains pinned to `typesafe/jev-1.13`. The docs already cover 1.14, but this test did not upgrade it.

## Live measurements

The user authorized up to 20 requests, ≤8192 input bytes each, and US$0.10. The actual run made 10 requests with 8194 total input tokens and cost **US$0.000344148**. Each took 493–1036 ms. The live snapshot was `typesafe/jev-1.13-20260917`.

| Case | split | capability | depth |
|---|---|---|---|
| dev-bulk | development | bounded | baseline |
| dev-risk | development | bounded | baseline |
| dev-debug | development | analytical | baseline |
| dev-proof | development | frontier | higher |
| dev-missing | development | insufficient_context | baseline |
| hold-extract | holdout | bounded | lower |
| hold-batch | holdout | bounded | baseline |
| hold-tradeoff | holdout | analytical | baseline |
| hold-constraints | holdout | frontier | higher |
| hold-unknown | holdout | insufficient_context | baseline |

[Test inputs and independent expectations](../eval/cases.json), [question definitions](../src/presets/reasoning-depth/rubric.json), and [budget-guarded live test script](../eval/live.mjs) (their names then carried the `policy-v2-` prefix). Depth is judged independently from the same task evidence, relative to the recommended effort of a suitable model, without consulting the capability answer that has not yet returned. If both dimensions are specified, neither is judged; if only one is specified, only the other is asked.

The live test script reserves budget before each request and counts failures as attempts. It reserves 65536 input tokens per request, far more than the synthetic inputs. If `usage.cost` is unknown, it stops rather than recording zero. The 10 remaining authorized requests are not spent by default; a new results file does not create a new budget. The operator must reconcile the budget across runs; the script is not an account-level spending limit.

## Initial implementation mapping

Version `capability-slots-1`: Claude bounded/analytical/frontier = Haiku/Sonnet/Opus 5.5; Codex = Luna/Sol/Sol (only two capability models are selected in the current catalog; no third model is invented). Recommended effort uses the current [official starting points](../src/effort.ts#L7-L16): medium for all three Claude models, high for Luna, and medium for Sol. Depth moves at most one step in the supported sequence; automatic routing never uses max. Explicit values still pass catalog, allowlist, and cap checks; invalid values cause an error, not substitution.

This mapping is an initial experimental baseline; it does not independently establish that the child models are optimal for their slots. No actual child model calls or end-to-end holdout comparisons were run. Effects on cost, quality, and rework remain unknown.
