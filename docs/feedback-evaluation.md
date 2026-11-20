# AUTO manual feedback data and evaluation criteria

## Records
`$DSH_HOME/state/auto-model-routing/allocation-feedback.jsonl` is a local append-only log. It does not contain conversation text or API keys.

Binding rows contain `sessionId`/`messageId`/`decisionId`, `depth`, the actual `model`/`effort`, and the added `boundAt` and immutable `snapshot`: `decidedAt`/`appliedAt`, `strategy` (the actual main model's strategy family ID, omitted if no family matches), `decisionProvider`/`decisionModel`, judgement time in ms, returned `confidence`/`probabilities`, actual `provider`, `requestSeq`, and `requestTurn` when available. Snapshots written before 0.5.0 have `policyVersion`/`mappingVersion` instead of `strategy` and remain readable as written. Missing `strategy` stays unknown; it is not inferred. The `label` endpoint omits those two historical keys from its response. `requestSeq` identifies a request header event in the same session and can be joined to session history to find the actual request and usage. A binding does not prove task completion or that usage is known.

Feedback events have `type:feedback` and carry `sessionId`/`messageId`/`decisionId`, `at`, and `feedback`. New events omit `version`; older events with `version:2` remain readable. Rows with other unknown keys are skipped as corrupt. Every edit or withdrawal is appended separately; `null` withdraws feedback. Readers apply events in append order to existing exact bindings. Complete historical records remain compatible; a later row with the same identity cannot replace the original snapshot. Missing timestamps or snapshots in older records remain unknown; do not fill them with the migration time or the latest configuration.

## Evaluation
- The unit of evaluation is (`sessionId`, `decisionId`), not each `assistant` message, to avoid counting multiple tool messages in one turn more than once. Take the last event for each message, then the last feedback for each decision. For historical rows without timestamps, use append order within the file; do not infer an order across files.
- Count `appropriate`/`too-high`/`too-low` separately. `unknown` does not mean satisfied, `null` withdrawals do not count as valid ratings, and unrated decisions do not count as appropriate. Report conflicts across message ratings separately.
- Group by strategy family (`strategy`) and by `depth`/actual route. Group pre-0.5.0 snapshots by original `policyVersion`/`mappingVersion` and label them `historical`. Put records without snapshots in a separate `unknown` group. Do not pool historical and family groups for comparison.
- Join actual usage, latency, and rework evidence using `requestSeq` and message IDs. If prices or token counts are unavailable, mark them unknown. Subjective feedback is not a correctness oracle, and the appropriate-rating rate alone cannot prove quality or savings.
- For on-demand observation reports, see the bundled `auto-model-routing-report` skill (`lib/usage-report.js`, read-only). There is still no automatic threshold adjustment, training, or retry with a different model.

## Implicit facts and distribution (2026-10-26)

The runtime appends only `{type:'fact', sessionId, decisionId, fact, at}` (pre-0.5.0 fact rows have `version:1` and remain readable). `fact` is only `exposed` or `manual-switch`. Only the first fact per decision and type is retained; the Host sets the time, and message text is not collected. Exposure requires the entire reply action bar to be continuously visible for 3 seconds on the foreground, focused page. When switching to MANUAL, capture the current main decision before clearing runtime state and record it only after the switch succeeds. Write failures are logged without blocking the main flow.

Turn endings and continuations are not written to the ledger again; on-demand reports derive them from existing logs. Use the actual turn number of the decision's last associated call, not its originating user turn. Continuation time is the start of the first subsequent user turn. Exposure must precede continuation; otherwise it is treated as a later look back and does not count. Exposure without continuation still counts, but cannot establish implicit no-objection.

Each comparison subgroup's five `implicit.counts` categories are mutually exclusive and add up to the number of decisions:
1. `explicit`: Explicit feedback exists. `implicit.explicit` breaks it down by rating and lists conflicts separately.
2. `negative`: No explicit feedback, and the user either interrupted the turn containing the decision's last associated call or switched to MANUAL. `implicit.negative` breaks down the two reasons, which can overlap.
3. `implicit-ok`: Valid exposure, normal completion, and user continuation, with no negative facts. This records only that these behaviors occurred together; it does not prove that the allocation was appropriate.
4. `inconclusive`: Valid exposure but insufficient evidence for the other conditions, including no continuation, unknown turn ending, or parent-session cancellation.
5. `unobserved`: No valid exposure.

`implicit.exposedExplicit` is a reference count of decisions with valid exposure and explicit feedback. Exposure does not prove the reply was read. A user might interrupt a turn or switch to MANUAL because the task changed, not because the strategy was wrong. Do not backfill exposure in older data or treat unknowns as positives. Keep implicit signals, explicit feedback, and future machine review separate; none automatically changes the strategy.

After the D012 fix, turns whose effective configuration is unchanged and that emit no new `request/header` also bind a decision. `snapshot.requestSeq` points to the effective request header at the time (possibly from an earlier turn), and `requestTurn` is the active turn at application time. Recording coverage will improve after rollout; this closes a coverage gap, not a policy gap. Do not directly compare appropriate-rating rates before and after the fix.

## Certainty
The UI calls this “decision confidence.” The Choice formula is `(pmax - 1/n)/(1 - 1/n)`, where `n` is the number of options for that dimension. In a three-way choice, a top probability of 70% gives 55%; this is neither the probability of the selected option nor a task success rate. The plugin displays the service's returned value and retains the distribution separately rather than deriving it from rounded percentages. Official definition: https://docs.typesafe.ai/confidence.md.
