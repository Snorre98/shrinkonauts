# ADR-0005: Conditional links and blocked-link feedback

Status: Accepted

## Context

The puzzle graph can express conjunction through relays, but not causal order.
04's intended sequence is terminal plate → Ca²⁺ window → packet release →
receptor bind. Today a player can pulse the receptor before the Ca²⁺ gate
opens; the win still requires both inputs, but the binding has already happened
and the player receives no "not yet" feedback.

05's brain gate and the Silicon controller route also benefit from explicit
"only if" semantics. The engine must not become a general scripting system or
a phase sequencer.

## Decision

Event links may declare an optional condition and feedback message:

```json
{
  "from": "pulse-terminal",
  "to": "nicotinic-receptor",
  "type": "pulse",
  "requires": "ca-gate",
  "message": "The terminal has not released yet. Trigger the terminal first."
}
```

- `requires` names a node in the same puzzle. The link applies only when that
  node's `active` state is true. Allowed condition nodes are `gate` (open),
  `timer` (elapsed), `counter` (reached), `relay` (active), `receptor` (bound),
  `plate` (pressed), `zone` (occupied), and `trigger` (fired). `prop` and
  `pulseSource` are not condition nodes in this upgrade.
- `message` is optional, non-empty authored text. It is only meaningful with
  `requires`.
- When the condition is false, the link is **not applied**. The runtime emits
  a `linkBlocked` event with `from`, `to`, `type`, `requires`, and `message`.
- `GameRuntime` surfaces `message` through the existing toast surface. It does
  not add a HUD panel or record evidence. A blocked link is feedback, not a
  fail state.
- For a blocked `pulse`, the pulse is consumed and the normal cooldown applies.
  The receptor does not bind. The player can retry after the cooldown and the
  gate opens.
- `requires` is allowed only on event links: `pulse`, `press`, `release`
  (the plate-release event link), `enter`, `exit`, `increment`, `start`,
  `stop`, `reset`, `elapsed`, `reached`, `bind`, `unlock`, `clear`. State links
  (`activate`, `deactivate`, `open`, `close`) are conjunction/evaluation links
  and do not accept `requires` in this upgrade. Adding conditional state links
  later needs a new ADR.
- The validator rejects unknown `requires` nodes, `requires` on state or
  non-condition nodes, `requires` on state links, and empty `message` strings.
  A condition may reference the link's source or target when that node is a
  condition type; that is legal but usually redundant.
- No new node type, no new link type for the condition, and no new save field.
  The condition is evaluated from puzzle state each time the link would fire.

## Consequences

**Easier:**

- 04 can enforce "pulse only after the Ca²⁺ gate opens" and explain a blocked
  attempt.
- 05/Silicon can add causal guards without a phase engine.
- The condition is visible in the puzzle document and testable purely.

**Harder:**

- Authors must reason about condition dependencies; a blocked link can be
  silent if no message is authored.
- A pulse that is blocked still consumes cooldown; authors must tune timing.

**Constrained:**

- No conditional state links in this upgrade.
- No scripts, callbacks, or arbitrary expressions.
- No evidence event for blocked feedback.
- No new UI surface; feedback uses the existing toast.

## Alternatives considered

- **A phase sequencer** — expressive but a much larger schema/runtime change
  and harder to debug. Rejected for this upgrade.
- **A new conditional node type** — duplicates links and complicates the
  validator. Rejected.
- **Feedback only, no hard ordering** — leaves the binding chronology wrong.
  Rejected.
- **Reuse a relay with `not`** — relays cannot gate a pulse link and add
  wiring noise. Rejected.
