# AUTO host capability verification (official 0.2.0-rc.2)

> Historical record: Names, paths, and behavior reflect the 0.4.x version at the time. From 0.5.0 onward, AUTO has one strategy, with rules in `src/rubric.json` and family strategies in `src/strategies/`.

## Conclusion

**The official entry points are sufficient for a plugin to read the exact child identity and current task before the first model request in ordinary child sessions, forks, and teammates, and to override the actual provider/model/effort without modifying the host or compat.** This demonstrates what the host allows, not that existing AUTO supports these paths.

Only the host probe was completed. Policy, Jev, production persistence, deployment, and real-model compatibility were not implemented or verified here. In particular, fork history compatibility across real providers has not met the support bar; this is not grounds for enabling production automatic routing.

## Method and scope

- Repeatable [probe](../scripts/host-capability-probe.mjs): isolated temporary npm prefix, official packages pinned exactly to `0.2.0-rc.2` and Cordis to `4.0.4`. The probe checks versions of all directly loaded packages before running. Neither launcher nor compat is loaded.
- Official Agents, Loop, Sessions, Subagents, spawn/fork providers, Teams, JSONL persistence, and session-query make up the real host service chain. Adapters are local fakes. Only `probe` and `probe-other` are allowed as providers, and runtime `fetch` explicitly throws. Dependency installation accesses npm but makes no model or Jev requests.
- Read the incoming task from `decision.messages` on the global `agent/pre-step` hook, record deterministic test decisions by `agent.id`, and apply the configuration through the `agent/request` waterfall. Test labels are only an oracle, **not a production binding mechanism that can reuse prompt matching**.
- Verify both the child's `requestHeader().config` and the last request received by the fake adapter. Correlate them by request `sessionId` and verify provider, model, and effort separately. Independent adapter instances record the provider; matching model names alone do not prove routing.
- All tasks are synthetic. The JSONL and simple decision files are written only to the temporary directory; raw sessions are not committed.

## Support matrix

| Path | Exact parent/child identity and task | Request entry point and actual execution | Concurrency, continuation, and recovery | Conclusion |
|---|---|---|---|---|
| one-shot ordinary `start('spawn')` | Passed: run ID, live child, and parentSession match the incoming task | Passed: cross-fake-provider routing plus model/effort | One request; concurrency not tested separately for this entry point | Official service entry point is usable; not production applied |
| continuable ordinary `startContinuable('spawn')` | Passed | Passed | Two different tasks submitted concurrently received distinct configurations, with the parent request unchanged; recovery passed after rebuilding the host | Viable basis for implementation; requires plugin-owned decision recovery |
| one-shot / continuable fork | Passed: incoming task excludes the parent-history marker, while the full session retains the parent's text history | Passed: fake provider switch | No fork-specific cold recovery or concurrency test | Host entry point is usable; real history compatibility is unverified, so heterogeneous production forks are not claimed as supported |
| teammate fresh | Passed: official TeamService → continuable child | Passed: the Team creation API need not expose a model parameter | Later messages with different test labels did not trigger reselection; messaging after host reconstruction restored the same route | Official service entry point is usable; tooling and production persistence are unverified |
| teammate fork | No separate combined test | Ordinary fork results do not count as a pass | Not covered | Unverified in this round; do not auto-apply |
| ACP / remote-process child sessions | Not covered | The current global hook is process-local | Not covered | No support claim in this round |

Concurrency evidence shows identity isolation for submissions made via `Promise.all`, not behavior under high load, long interleaved streams, or cancellation stress. Continuation evidence covers new messages producing new requests, not deduplication when the same message ID is delivered again.

## Key finding: Request overrides do not persist model selection

The official continuable descriptor stores model/effort at creation. `agent/request` overrides do not update it.

The probe includes a negative control: route a child → shut down the entire host → rebuild the host with the same persistence directory but disable decision application → send a new message. The actual request fell back to the parent configuration `parent/medium`, not the initially applied `small/high`.

Only after rebuilding the host again and restoring the `childId → provider/model/effort` decision from the probe's own file did requests from the same child and teammate keep their original selections. A production implementation therefore needs at least the following:

1. Bind the initial decision to a stable session identity and do not reclassify later messages. Do not rely on transient Agent objects or prompt similarity.
2. Restore decisions using plugin-owned persistence or a verifiable reconstruction mechanism, and handle recovery failures. Do not quietly inherit and report applied.
3. Preserve the source of explicit model/effort constraints. The probe's label routing does not implement that behavior and cannot ship as is.
4. Avoid the main UI's `sessionController.selectModel`, which also saves the global default selection. The probe never calls it.

This verifies only ordinary read/write recovery with a simple test file, not a production persistence design. It does not cover atomic writes, concurrent processes, crashes, corruption, version migration, or switching to MANUAL.

## Official source references

These are paths in the official release packages installed at verification time, not requests for upstream changes. Rebuild the temporary prefix with the commands below; line numbers apply only to these pinned versions.

- pre-step / request types (`node_modules/@deepseek-ai/dsh-agent/lib/types/runtime-types.d.ts#L293-L332`): public event inputs and waterfall return contract.
- Loop request chain (`node_modules/@deepseek-ai/dsh-agent-loop/lib/index.js#L1164-L1220`): runs the waterfall before `llm.prepareCall` and records the resolved request header.
- scopeTarget (`node_modules/@deepseek-ai/dsh-scope/lib/index.js#L315-L337`): a global listener without an Agent scope marker can observe distinct child identities.
- SubagentStartRequest (`node_modules/@deepseek-ai/dsh-subagent/lib/types/types.d.ts#L136-L162`): exposes `agentOptions`, so host capability need not be inferred from tool schemas.
- Continuation creation (`node_modules/@deepseek-ai/dsh-subagent/lib/types/continuation.js#L101-L176`) and cold recovery (`node_modules/@deepseek-ai/dsh-subagent/lib/types/continuation.js#L354-L374`): descriptor and recovery options.
- Official Team creation forwarding (`/tmp/dsh-official-routing-probe.HImElm/node_modules/@deepseek-ai/dsh-experimental-agent-team/lib/index.js#L573-L582`): forwards only prompt/parent, not agentOptions. This does not prevent a plugin from configuring the child request entry point.
- Default selection side effect (`node_modules/@deepseek-ai/dsh-api-session-controller/lib/index.js#L720-L739`): `selectModel` also calls `saveSelection`.

`resolveChildAgentOptions` is an official public export (`node_modules/@deepseek-ai/dsh-subagent/lib/types/index.d.ts#L55`). Earlier function-level experiments used an internal file path, but that does not make the function private. This end-to-end probe imported no internal helpers.

## Rerun

Run from the repository root with Node 24. This does not change repository dependencies, the manifest, or the current GUI:

```bash
PROBE_HOME=$(mktemp -d /tmp/dsh-official-routing-probe.XXXXXX)
npm install --prefix "$PROBE_HOME" --save-exact --ignore-scripts --no-audit --no-fund \
  @deepseek-ai/cordis@4.0.4 \
  @deepseek-ai/dsh-agent-loop@0.2.0-rc.2 \
  @deepseek-ai/dsh-experimental-agent-team@0.2.0-rc.2 \
  @deepseek-ai/dsh-session-persistence-jsonl@0.2.0-rc.2 \
  @deepseek-ai/dsh-session-query-sqlite@0.2.0-rc.2 \
  @deepseek-ai/dsh-subagent-fork-in-process@0.2.0-rc.2 \
  @deepseek-ai/dsh-subagent-spawn-in-process@0.2.0-rc.2
node packages/dsh-auto-model-routing/scripts/host-capability-probe.mjs "$PROBE_HOME"
```

The full chain succeeds only when the probe outputs all 7 PASS results. The probe has separate dependency setup requirements and is not part of the default unit test command.

Issues found and corrected during setup: parent creation must supply a sessionId; official continuable tasks append return guidance, so the entire text cannot be asserted equal to the original prompt; a child may already be unloaded after normal completion, so preserve the exact Agent identity from the event; cold recovery requires session-query (`openAt: 'never'` retains exact reads without loading SQLite); separate npm installations without `--save-exact` can cause version drift, which the version assertions caught before reinstalling with exact pins. None of these fixes modified the official host.

## Results and local review

- Probe: 7 PASS results, including the recovery negative control. Review added an assertion that the parent's next request after the child task still used its original configuration.
- Vitest from the package directory: 25 test files and 162 tests passed.
- Strict OpenSpec validation and `git diff --check` passed.
- The first Vitest run from the repository root unintentionally matched worktrees in its path filter and did not load the package configuration, so UI tests reported a missing `clsx`. All tests passed from the package directory without installing repository dependencies or changing the UI.
- Full local review covered the new script and report and this round's design/task edits. No runtime code changed. The explicitly listed gaps in combination coverage and production mechanisms remain; they are not reported as applied.
- No repository-wide tests, build, sync, live model calls, or browser checks were run. No deployment changed.

## Explicitly out of scope

Live model or Jev calls, policy outcome and cost comparisons, history and tool-message compatibility for real providers, tool calls in a deployment, GUI, changes to subscriptions/MANUAL, upstream patches, and production AUTO routing. Existing AUTO request middleware still skips subagents; this report does not change the current feature commitment.
