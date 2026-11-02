# ADR-0047: Relay activation dispatches timer start links

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** Snorre
- **Related:** ADR-0034, ADR-0039, ADR-0042

## Context

The puzzle schema treats `start` and `stop` as event-driven links. The static
validator already accepts a relay as the source of a timer `start` link:
`src/puzzle/validate.ts` lists `relay` in `SOURCE_TYPES.start` and `timer` in
`TARGET_TYPES.start`.

The runtime dispatch table did not agree. `EVENT_LINKS.relayActive` was empty,
so a relay could become active and emit `relayActive`, but the event dispatched
no links. A document such as:

```text
controller-socket -> controller-relay: activate
sensor-trigger    -> controller-relay: activate
controller-relay  -> cpu-timer:        start
```

therefore passed static validation but never started `cpu-timer`. The Silicon
Interrupt Loop puzzle relies on exactly that edge: the relay is the integration
point, and the CPU wake delay must begin only when the relay activates.

The gap is in the runtime, not the content. Rewriting the puzzle graph would
change the integration-point semantics or add links the design does not own.

## Decision

`relayActive` dispatches `start` links:

```ts
relayActive: ["start"],
```

A relay activation is a one-shot transition event (`evaluateRelays` emits it
only when active changes). Links of type `start` from that relay are applied to
their timer targets in the same tick, after the relay evaluation. The timer then
advances on subsequent ticks.

`relayInactive` remains empty. A relay-driven `stop` is a separate behaviour and
has no authored use yet; adding it would be a broader semantic change than this
puzzle needs. `relay -> timer: reset` and `relay -> counter: increment` remain
undispatched for the same reason; they can be decided in a later ADR if content
needs them.

No schema, save field, node type, or link type is added.

## Consequences

**Easier:**

- A relay can represent an integration point that starts a downstream delay.
- The Silicon `controller-relay -> cpu-timer: start` edge matches both the
  schema and the runtime.
- The existing `EVENT_LINKS` contract stays a closed table; the change is one
  entry and one regression test.

**Harder:**

- Relay activation now has one event-driven side effect beyond relay state.
- A relay that reactivates after becoming inactive fires `start` again. An
  already-running timer ignores the second start; an elapsed one-shot timer is
  re-armed by the existing recovery invariant.

**Constrained:**

- Only `start` is dispatched from `relayActive`.
- No `relayInactive -> stop`, no implicit timer reset.
- No new save fields and no content-specific branch in the runtime.

## Alternatives considered

- **Rewrite the Silicon graph to start the timer from a plate or trigger** —
  would change the authored integration-point semantics and add links the
  design does not own. Rejected.
- **Make timer `start` a per-tick state check** — would re-arm a running timer
  every tick. Rejected.
- **Add a new link or node type** — unnecessary; the schema already permits the
  edge. Rejected.
- **Special-case the Silicon puzzle in the validator** — hides the runtime gap
  and duplicates graph semantics. Rejected.

## Tests

- `tests/puzzle-dispatch.test.ts` expects `relayActive: ["start"]`.
- A plate activates a relay, the relay starts a timer, and the timer reaches the
  win predicate.
- The existing dispatch contract test still rejects dispatch of non-event-driven
  link types (`pulse`, `activate`, `deactivate`, `open`, `close`).

## References

- [`../puzzle-engine/README.md`](../puzzle-engine/README.md)
- [`0034-puzzle-as-data-typed-dataflow.md`](0034-puzzle-as-data-typed-dataflow.md)
- [`0039-puzzle-as-assessment-source.md`](0039-puzzle-as-assessment-source.md)
- [`0042-puzzle-activation-lifecycle.md`](0042-puzzle-activation-lifecycle.md)
- [`../../src/puzzle/runtime.ts`](../../src/puzzle/runtime.ts)
- [`../../src/puzzle/validate.ts`](../../src/puzzle/validate.ts)
- [`../../docs/prompts/levels/01-interrupt-loop.md`](../prompts/levels/01-interrupt-loop.md)
