# policy-v2 development and acceptance record

> Historical record: Names, paths, and behavior reflect the 0.4.x version at the time. From 0.5.0 onward, AUTO has one strategy, with rules in `src/rubric.json` and family strategies in `src/strategies/`.

## Status

On 2026-10-25, after minimal live gateway acceptance, the user authorized upgrading AUTO by default without a version switch. The default configuration uses internal policy-v2; explicit legacy is for rollback only. The old four-tier settings are kept but ignored by the new strategy, and MANUAL is unchanged. The build was deployed, the existing service on port 3080 was restarted from a separate control process, and the live GUI confirmed there was no version selector and that AUTO showed the new strategy in use. A real comparison of quality, rework, and cost remains incomplete; no performance gains are claimed.

## Implementation entry points

- [Jev contract](../src/jev.ts): Reuses authentication, deadline, body limit, and error classification. The original tier question is unchanged. New main requests ask only about depth; child requests ask capability and depth in one call, skipping dimensions with explicit constraints.
- [Independent mapping](../src/routing.ts) (then `src/policy-v2.ts`): Versioned capability slots. Effort moves at most one step from the recommended starting point in the supported sequence, subject to the cap, and never automatically uses max. The mapping is an initial baseline: both Codex analytical and frontier use Sol; no third model was invented.
- [Host integration](../src/policy-host.ts): Official `tools/execute` → AsyncLocalStorage → `agent/created` binds the exact child ID and parent/root without relying on prompt similarity. The main session computes effort in each step's `agent/pre-step`, syncs via `selectModel` first, then writes to the step's pinned selection (from DSH 0.2.2 onward, `agent/request` cannot override it and a mismatch throws). A managed child's `agent/created` classifies the creation tool's `prompt` and uses `agent.model.select(route)` to write the child's own selection. `agent/request` only verifies; `request/header` records matching evidence.
- [Persistence](../src/policy-store.ts): Per-child hashed path, strict schema, and owner-only atomic replacement. Stores only identity, versions, constraints, route, and status, not original task text. Missing, corrupt, or incomplete recovery does not silently inherit. Later messages cannot reclassify an unfinished decision.
- [Tool](../src/subagent-tool.ts): Under policy-v2, optional preview is only `recommended`. The ordinary creation tool applies the exact route; preview is not reported as `applied`.
- [Settings](../src/client/settings-section.ts): No user-facing version switch. Leaving it unspecified selects the new strategy; the old four-tier table is shown only on explicit legacy rollback. Current capability slots are versioned in code rather than in another editable mapping table.
- [State API](../src/index.ts): `auto-model-routing.childRouting` accepts `{sessionId}`; main state returns policy/depth/effort. v2 does not use `selectModel`, avoiding the global default side effect.

## Coverage matrix

| Path or behavior | Evidence | Result and limits |
|---|---|---|
| Official ordinary fresh continuable tool and provider | [End-to-end script](../scripts/host-probe-children.mjs) (then `policy-v2-host-probe.mjs`) loads official 0.2.0-rc.2 and the production plugin with fake Jev and adapter | Actual request model/effort match; survives full host shutdown and reconstruction without reclassification |
| Official fresh teammate tool and service | Same as above | Creation, later messages, and full host recovery pass without reselection |
| Concurrent creation and explicit model/effort | [Host test](../test/policy-host.integration.test.ts) with official Tools/Agents and test creation tools | Exact identities stay isolated under concurrency; no judgement when both dimensions are explicit. No concurrency stress test for official ordinary/teammate providers |
| fork / teammate fork | Tools wrapper can reject upfront | Unsupported; real history compatibility is unverified, with no automatic conversion to fresh |
| Unbound service API, aliased tools, remote ACP | Stops at the child request if v2 is enabled but no binding exists | No support claim; no automatic decision when the root chain is unreachable. Does not claim to block native out-of-process creation |
| MANUAL / rollback to original strategy | Unit and host tests | No new judgement; bound instances keep the route selected at creation and do not switch models on later messages |
| needs-context / Jev 402 / invalid configuration | Host tests | Child request stops; root remains AUTO. No silent substitution or autonomous retry |
| Corrupt recovery data / identity mismatch | Store tests | Fails closed; per-child writes in one process, without cross-process contention or crash injection evidence |
| Actual request differs from route | Host mismatch test | Records `failed`, not `applied`. Throwing in `agent/request` verification and the header observer is best-effort blocking (from 0.2.2 onward the runtime itself also rejects an `agent/request` result that differs from the step's selection). A configuration match does not imply call success |
| Current allowlist and parent snapshot | Fresh catalog check + parent's `subagent/model-selection-policy`, when present | A newer global list does not widen the parent snapshot. The end-to-end script uses a synthetic allowlist service seam, not verified live GUI settings wiring |

Host tests with fake adapters and Jev do not prove real provider compatibility, deployment of actual tool schemas, or network performance. `applied` means only that request/header configurations matched; it does not mean the task passed, the model call succeeded, or the provider honored effort.

## Verification

- Live Jev: 10 requests / 5 development + 5 holdout. All matched expectations and cost US$0.000344148; see [Jev record](jev-policy-v2-validation.md). No actual child model calls.
- `npm run typecheck`, `npm test` (29 files / 184 tests), and `npm run build` passed in the package. Existing tsdown deprecation/format warnings were left alone; no incidental toolchain upgrade.
- Official end-to-end script: ordinary and fresh teammate creation, requests, and full host cold recovery passed.
- The earlier [host capability probe](host-capability-report.md) established basic service/request capability. The new end-to-end script adds the production plugin and official tool bindings rather than treating the earlier test-label oracle as production code.

To rerun end to end, build the package first. In the original temporary official prefix, install the exact versions `@deepseek-ai/dsh-tool-subagent@0.2.0-rc.2`, `@deepseek-ai/dsh-experimental-tool-agent-team@0.2.0-rc.2`, and `@deepseek-ai/dsh-launch-environment@0.2.0-rc.2` (`--save-exact --ignore-scripts`), then run:

```sh
node packages/dsh-auto-model-routing/scripts/host-probe-children.mjs "$PROBE_HOME"
```

The official standing tool with `modelSelectionSettings:true` requires a preset-scoped context. The isolated script does not fake that composition; it uses standing fixed-schema tools with a synthetic allowlist. Explicit selection and parent snapshots are therefore covered separately by host tests, and the live preset/GUI combination is not marked as passed.

## Fixes after independent review

After the user authorized read-only independent review, fixes covered child input provenance filtering, epoch invalidation when toggling modes, a MANUAL recheck after `await`, and sidecar binding detection when the routing record is missing. Official persistence rejected the attempted custom session events, so they were removed entirely; there is no dependency on upstream changes. The full official cold-resume probe passed again. The final focused independent review concluded PASS, but its test command could not find vitest. Passing test evidence comes from the main session's full run; the independent static review is not reported as a separate test pass.

The `.bound` marker stores only the child ID, not the task. If routing JSON is missing but the marker remains, the system fails closed. It cannot detect loss of the entire plugin state directory (both records) or loss of older records without markers, so not all storage loss is covered.

## Gateway integration (2026-10-25)

The user specified that actual models should initially run only through the then-configured self-hosted gateway, with OpenRouter reserved for Jev and no local Claude/codex. v2 supports exact transport identities and persists the full model ID. Automatic mapping uses `claude/...` and `codex/...` families without disguising a gateway route as a local provider. Completed routes under old mappings retain their original configuration. Other gateway models can be selected explicitly; no automatic guesses are made without a defined capability slot. For unknown models, effort uses the LLM catalog's `defaultEffort` and stops if it is missing. Known families keep their versioned official starting points.

The legacy catalog still does not include this gateway. Persistent child route replay uses a separate complete policy catalog so turning off the experiment does not invalidate existing instances. Catalog and allowlist checks use the exact provider+model. Slashes in model names are allowed only on the v2 gateway path; legacy configuration validation is not relaxed.

Verification: 190 tests, typechecking, and build passed. With the gateway-specific flag, the official-tool end-to-end script passed ordinary/fresh teammate and full host cold recovery (fake adapter and Jev, no external network). At the time, the gateway plugin source showed `resolveModel.reasoning` building `defaultEffort` from cached effort levels. Online generation and actual use of effort were not verified; cache and simulation are not live measurements.

## Rollback and follow-up

- Switch back to legacy or MANUAL: no new judgements. Existing children continue restoring their initial routes, avoiding an unexpected fallback to the parent model.
- Remove or disable the plugin entirely: request overrides cease and official cold resume returns to the creation descriptor configuration. Check beforehand that existing child tasks can tolerate this change.
- Do not modify the current spec on main or archive the change. Its constraints still describe the previous default strategy. The experiment has a separate delta spec.
- No real child model holdout comparison, total rework cost evaluation, browser deployment acceptance, repository-wide tests, sync, or release was run at this stage. 4.3 and default rollout were incomplete; actual quality and benefits were unknown, not zero.
