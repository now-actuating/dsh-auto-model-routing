---
name: subagent-model-routing
description: 'Use before creating or reusing a subagent: delegate through the official fresh creation tool and pass through the model and effort specified by the user or lead as given; AUTO makes its own selection at creation time, and route_subagent is only an optional preview.'
---

# Child Session Model Selection

In AUTO, the plugin routes a subtask before the first request of the exact child session created by an **official fresh creation tool**: it assesses the capability and effort needed, checks the current directory and the official allowlist, and binds the route to that child session. The main agent breaks down the work, delegates it, and verifies the results; it does not estimate the tier itself. The tool follows the mode of its main session: only in AUTO does it make a routing decision and send the redacted task text to the decision service selected in settings; in MANUAL it makes no routing decision and sends nothing externally.

## Creation

1. **Use an official fresh creation tool** (`subagent` or fresh `spawn_teammate`) and give it a clear objective and scope. If the objective or scope is insufficient, the plugin returns needs-context; add the missing details before trying to create the child session again.
2. **Pass explicitly specified values through unchanged**: If the user or lead specifies a model or effort, pass it to the official tool as given. If only one is specified, the plugin decides only the other; if both are specified, it only validates them and does not call Jev.
3. **`route_subagent` is only an optional preview**: No preview is required to delegate; the routing decision is made only once at creation time. A returned `status: recommended` does not mean the route was applied. Do not pass the recommendation to the official tool as explicit parameters; let the plugin make its own selection at creation time.
4. **When the main session is in MANUAL**: `route_subagent` returns `routed: false`. Delegate using the official defaults, passing only values specified by the user or lead. Do not pass any other provider/model/reasoning_effort values or guess the tier.
5. **Labeling**: At the end of `description`, label the configuration actually used as `[model·effort]`, for example, `Check authorization boundaries [<model>·<effort>]`. If unsure, first check the evidence of application in item 7.
6. **Forks stay consistent with their parent session**: AUTO does not route forks; under native DSH behavior they inherit the parent session's configuration. Use fresh creation instead when task-specific selection is needed.
7. **Evidence of application**: Check recommended / applied / unsupported / needs-context / failed for the corresponding child session via the `childRouting` status interface. The applied status comes from the actual request headers, not the tool's recommendation; creation paths without a bound route do not count as routed.

## Failures

8. If you called the preview: When it returns `status: fallback` (no usable route in the directory or allowlist, decision service failure, etc.), delegate using the official defaults and briefly explain why to the user. When it returns `needs-context`, add the objective and scope before delegating. When it returns an error (including a canceled decision), **pause delegation and ask the user**. Tell the user the exact error text; do not guess the tier, switch to another model, do the work in the main session instead, or retry on your own. If routing is unavailable at creation time, it automatically falls back to the default DSH behavior and displays a warning in the main session panel.
9. If the tool is unavailable (the plugin is not enabled), tell the user "Jev model selection for child sessions is not enabled," then delegate using the official defaults, passing only values specified by the user or lead.

## Reuse

10. Before sending a new task to an existing child session, compare its `[model·effort]` label with the new task's requirements. **Create a new** child session if higher effort or a different model family is needed, or if the original configuration cannot be confirmed. Subsequent messages to an existing child session do not trigger model selection again; do not dynamically change its model or effort after creation.

This skill is usage guidance and cannot force an agent to call a particular tool before every delegation. It is consistent with the environment-level "Child Session Delegation" instruction: delegate directly through the official fresh tool; preview is optional.
