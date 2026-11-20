# AUTO feedback data (retired)

Fork `0.7.1+mod.4` removed main-session effort adjustment, and with it the reply-bar allocation rating, the `label` / `observe` endpoints, the `manual-switch` / `exposed` facts, the `auto-model-routing-report` skill and `lib/usage-report.js`.

## Existing records
`$DSH_HOME/state/auto-model-routing/allocation-feedback.jsonl`, written by earlier versions, is left exactly as it is: the plugin no longer reads, appends to, migrates or deletes it. It holds only main-session decision bindings, ratings and facts (IDs, depth/model/effort, decision service metadata and timestamps; no task or reply text and no keys). Keep or remove it yourself; removing it changes nothing at runtime.

## Subtask decisions
Subtask decisions are still recorded per child under `state/auto-model-routing/policy-v2/` (unchanged schema) and shown in the chip panel as the latest decision. A rating or report for subtask decisions is not implemented.

## Certainty
The UI calls this “decision confidence.” The Choice formula is `(pmax - 1/n)/(1 - 1/n)`, where `n` is the number of options for that dimension. In a three-way choice, a top probability of 70% gives 55%; this is neither the probability of the selected option nor a task success rate. The plugin displays the service's returned value and retains the distribution separately rather than deriving it from rounded percentages. Official definition: https://docs.typesafe.ai/confidence.md.
