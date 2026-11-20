---
name: auto-model-routing-report
description: 'Use only when the user explicitly asks to evaluate the effectiveness of AUTO, observe token usage or the distribution of routing decisions during AUTO, or names auto-model-routing-report directly: summarize local AUTO decision records and actual session usage without writing anything. Do not run it proactively or create scheduled tasks; being in AUTO, general token questions, routing decisions, and routine tasks are not triggers.'
---

# AUTO Usage Observation Report

**Use only when the user explicitly asks.** Do not run it proactively, create scheduled tasks, or collect data in the background. A session being in AUTO, a user asking about token pricing, or a discussion of routing strategy is not a reason to use this skill.

## What it can answer

- Which decisions were made during AUTO, grouped by strategy family (`group`), model, and reasoning depth (depth), and how many tokens those decisions actually consumed.
  - `group` is the strategy family ID (e.g. `claude` or `codex`). Records written before 0.5.0 retain their original group identifiers and have `historical: true`; records without a snapshot go into `unknown`. Do not pool historical groups with family groups for comparison.
- Data coverage: which turns lack a record, and how many sessions are in AUTO but have no records at all.
- How the starting effort changed relative to the turns before the first AUTO record.

**It cannot answer "How much did AUTO save?"** The data is observational, not a controlled comparison.

## Steps

1. Run (read-only: no file writes, network access, or model calls):

   ```bash
   node "<plugin-directory>/lib/usage-report.js"                     # All data
   node "<plugin-directory>/lib/usage-report.js" --since 2026-11-01  # From 00:00 on that date in the local time zone
   ```

   `<plugin-directory>` is the directory containing the `dsh-auto-model-routing` package. If `$DSH_HOME` is unset, the script reads `~/.dsh` by default.

2. **Check data quality before looking at the numbers:**
   - If any item in `failures` is clearly nonzero, or `coverage.unlinkedBindings` is unusually high, the log format may have changed with a DSH upgrade. Stop interpreting the results and first tell the user that the format needs to be checked.
   - A `failures.tail-incomplete` value of 1 is usually normal because the current session's log is still being written.

3. When relaying the results, **preserve the following meanings without overstating them**:
   - `conclusion: insufficient-sample` → "The sample is too small to draw a conclusion yet." The threshold is ≥20 decisions from ≥3 sessions.
   - Explain each item in `caveats` in one sentence:
     - `observational-not-controlled`: The data is observational rather than a controlled comparison; establishing causality requires a dedicated controlled experiment.
     - `scope-main-session-assistant-calls-only`: Usage from child sessions, compaction summaries, title generation, Jev decisions, and retries after failures is excluded, so no savings can be inferred.
     - `only-applied-decisions-recorded`: Only decisions that took effect are recorded, so the results may be skewed toward certain kinds of turns; `coverage.turnsWithoutRecord` shows the size of the gap.
     - `token-semantics-differ-by-provider`: Providers may count tokens differently, so do not compare across models.
     - `reference-before-auto-effort-only-confounded`: Use `referenceBeforeAuto` only to see how starting effort changed; it is confounded by factors such as session stage, task type, and model switches, and cannot serve as a control group.
     - `mode-history-not-persisted`: Session mode changes are not saved, so session counts are only a rough reference.
     - `implicit-ok-not-appropriateness`: An implicit lack of objection does not mean the assignment was appropriate and cannot count as explicit positive feedback.
     - `exposure-not-proof-of-reading`: Being visible in the foreground for 3 seconds counts only as exposure and does not prove the user read it.
     - `historical-exposure-unknown`: Exposure before rollout is unknown and is not backfilled.
     - `exposure-after-continuation-excluded`: Exposure that first occurs after the next user turn does not count, so reviewing old records cannot create apparent approval.
   - `implicit.counts` classifies decisions in priority order as explicit feedback, negative behavior, implicit lack of objection, inconclusive, or unexposed; the five categories sum to the number of decisions. The two reasons in `implicit.negative` can overlap. `implicit.exposedExplicit` is a reference for decisions with both valid exposure and explicit feedback, not an accuracy rate.
   - Do not calculate a savings percentage yourself, claim "quality was unchanged," or call the period "before the first record" MANUAL.
   - The denominator for token averages is **the number of calls where the field was present** (`present`); `null` means the field never appeared, not that its value was 0.

4. If you want to paste the report verbatim outside the current session, such as in Feishu or an issue, **ask the user for confirmation first**. Model and provider names may contain internal information.

## Premises

- The report is recalculated from raw records and session logs each time; no snapshots are saved. After a user deletes old sessions, their history can no longer be included in the statistics.
- The early four-tier judgment ledger `judgements.jsonl` is used only to locate the first AUTO record in each session; the report does not count its annotations.
