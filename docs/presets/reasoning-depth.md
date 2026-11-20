# Preset `reasoning-depth` (default)

Rules: [rubric.json](../../src/presets/reasoning-depth/rubric.json). This is the sole `src/rubric.json` from 0.6.6 and earlier, moved without changing a byte. Its SHA-256 matches `rubricSha256` in [routing-oracle-0.4.2.json](../../test/fixtures/routing-oracle-0.4.2.json). No context lines are enabled, so this preset sends exactly the same `questions` and `state` to Jev as before.

## Key points

- **capability** (subtasks only): Judge the minimum model capability needed to complete the task, regardless of its volume, risk, or importance.
- **depth**: Judge the reasoning investment required. `lower` is reserved for trivial lookups, copying, or fully specified mechanical steps. `higher` applies to tasks demanding unusually careful multi-step reasoning, reconciliation of difficult constraints, or a precise proof. All other cases, including insufficient evidence, get `baseline`. Volume and risk do not raise depth on their own.

## Sources and evidence

- Design and small-sample checks: [Jev classification validation](../jev-policy-v2-validation.md) (2026-10-24) and the 10 synthetic cases in [eval](../../eval/README.md).
- These establish only that the interface works and that classifications agree with expectations, not that real tasks improve in quality or cost less.

## Differences from `effort-as-verification`

| | `reasoning-depth` | `effort-as-verification` |
|---|---|---|
| What depth measures | Reasoning difficulty | Investment in verification, edge-case testing, and independent judgment |
| Quick first pass with someone reviewing | Usually `baseline` | Can be `lower` |
| Work with many edge cases (parsers, security reviews, bugs in existing code) | `higher` only if the reasoning is also difficult | `higher` |
| `Execution` context line | Omitted | Included |

## Known limitations

- The rubric conflates difficulty with the need for more verification, so tasks in areas like security and concurrency can be rated too low.
- Historically, risky but straightforward tasks were sometimes rated too high; the current rules explicitly say risk does not increase depth.
