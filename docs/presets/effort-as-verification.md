# Preset `effort-as-verification`

Rules: [rubric.json](../../src/presets/effort-as-verification/rubric.json). This preset is opt-in: select it in settings to enable it. It adds the `execution` context line.

## Source

[Using Claude Code: Spending your effort](https://claude.dev/blog/spending-your-effort/) (Anthropic, 2026-09-25). The data comes from Anthropic's internal Terminal-Bench 3.0 runs on Opus 5.5 / Fable 5.1, with 5 attempts per task. These are vendor results, not measured gains for this project.

## Findings and corresponding rules

| Finding | How this preset applies it |
|---|---|
| Effort changes how much the model double-checks its work, reproduces bugs before fixing them, consults reference implementations, fuzz-tests, and compares interpretations | Depth measures how much verification, edge-case testing, and independent judgment the next step requires, not how difficult the reasoning is |
| More effort can reduce missed edge cases, but it cannot fix a poorly chosen approach | The rubric makes that limit explicit; the risk of choosing the wrong approach or domain rules belongs to capability (use a stronger model) |
| Security, hardware, ML, and science benefit more; work that follows established procedures, such as operations and media, benefits less | `higher` lists domains with many edge cases; rule-driven operations stay at `baseline`; risk alone does not raise depth |
| Low is suitable when someone is working alongside the model and iterating | `lower` covers quick first passes someone will review and iterate on: brainstorming, sketches, drafts, explanations, and small, obvious changes |
| The more detailed the requirements, the more similar the outputs at different effort levels | Fully specified execution stays at `baseline` |
| Max is only for fully autonomous end-to-end tasks | The engine is unchanged: it moves at most one step from the model's recommended starting point, and AUTO never picks max automatically |

## `Execution` line

The second line of the judgement input is fixed text that identifies the invocation path only:

- Main conversation: `Execution: main conversation.`
- Managed subtasks and `route_subagent`: `Execution: delegated subtask; the result returns to an orchestrating agent.`

This line **does not** establish whether someone is reviewing the work step by step. A main conversation can also ask for work to be completed autonomously, without review. Prefer a quick first pass only when the task text itself indicates someone will review and iterate on it. The plugin does not deterministically adjust depth based on the invocation path.

## Differences from `reasoning-depth`

See [reasoning-depth.md](reasoning-depth.md#differences-from-effort-as-verification).

## Known limitations

- **No live judgement evidence for this project**: Wait for user authorization before running a paid check with `eval/live.mjs --preset effort-as-verification`. The following thresholds are reference points, not prerequisites for use: the expected-set hit rate on the 18 synthetic cases should be at least as high as that of `reasoning-depth` on the original 10; `risk-not-depth` and `spec-feature` must not be classified as `higher`. A stability check with 4 replays exceeds the single-run limit and needs separate authorization.
- **GPT family**: The article covers only Claude models; applying this preset to the GPT family is an unverified extrapolation.
- **Caching**: The article says switching effort in Claude Code does not break the prompt cache; whether the same holds for DSH adapters still needs to be measured.
