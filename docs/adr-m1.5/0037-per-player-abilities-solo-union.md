# ADR-0037: Per-player abilities with a solo union

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** Snorre
- **Related:** ADR-0009, ADR-0016, ADR-0017, ADR-0018, ADR-0020, ADR-0025

## Context

M1 stores one global ability list. Both players can scan and dash, and the
runtime chooses the nearest active player for an action. The Signal Ferry needs
distinct roles: one player sends a pulse, the other carries and places the
tracer. If both players have every tool, co-op collapses into two solo bodies.

Solo is mandatory (ADR-0016). Co-op must be additive, not a gate. The solution
therefore cannot require two simultaneous bodies.

## Decision

Abilities are **derived per player from party composition**, not saved per
player and not hard-coded to a character.

### Ability set

| Ability | P1 | P2 | Solo |
|---|---|---|---|
| `scan` | yes | yes | yes |
| `signal-dash` | yes (once unlocked) | yes (once unlocked) | yes (once unlocked) |
| `pulse` | yes | no | yes |
| `carry` | no | yes | yes |

- `pulse` is a themed `scan`: the world ability is scanning a terminal, not a
  new verb.
- `carry` is a themed `interact`: the world verb stays interact; the carrier
  role is P2 in co-op.
- Unlocks remain run-level progression. `signal-dash` unlocks for the party;
  it is not saved per player.
- If P2 leaves, P1 receives the solo union (`scan`, `pulse`, `carry`, and
  unlocked dash). If P2 joins, the roles split again. Carrying is dropped at
  the current position on either transition (ADR-0040).

### Input map

| Player | Move | Jump | Dash | Scan | Pulse | Carry | Throw | Interact |
|---|---|---|---|---|---|---|---|---|
| P1 | A/D | W or Space | Shift | Q | F | — | — | E |
| P2 | Arrows | Up | / | . | — | ' | ; | , |
| Solo | A/D | W or Space | Shift | Q | F | G | H | E |

Solo uses `G` for carry and `H` for throw so the action does not overload
`E`. All bindings are keyboard-only. Remapping is out of scope for M1.5 and
remains an accessibility follow-up.

### Action routing

- An action is routed to the player that owns the ability, not to the nearest
  active body.
- A solo action is routed to P1's body (the only body).
- P2's interact action performs carry/place/drop/throw when a prop is in range;
  otherwise it performs the normal interaction.
- P1's pulse action activates the nearest pulse source in range.
- Shared scan remains available to both players and records the same concept
  log entry.

### HUD

The HUD shows the active ability strip per body, pulse cooldown, carry state,
and the context action. It does not show a disabled P2 strip in solo mode.

## Consequences

**Easier:**

- Co-op has an explicit reason to exist: parallel roles, not two copies.
- Solo has the same solution, serialised with one body; no alternate route.
- Ability unlocks remain simple run progression.
- The input map is testable per action.

**Harder:**

- The runtime must route actions by player, not by proximity.
- P2's four-key cluster (`'`, `;`, `,`, `.`) is cramped; accessibility review is
  needed.
- Joining/leaving mid-carry needs a defined drop rule.

**Constrained:**

- No per-player ability save field.
- No co-op-only puzzle solution.
- No new world verb for pulse or carry.
- No mouse or hold-gesture actions.

## Alternatives considered

- **Both players get every tool** — no role asymmetry; co-op is two solo
  bodies. Rejected.
- **Pulse replaces scan** — destroys the concept-log loop and the scan verb.
  Rejected.
- **Context-only interactions** — fewer keys, but ambiguous in a room with a
  terminal, a tracer, and a receptor. Rejected.
- **Swap-control** — one body controlled by both players in turn. Rejected;
  it weakens parallel co-op and complicates save/state.
- **Separate solo variant** — violates the "solo is complete" requirement and
  doubles the content. Rejected.
- **Save abilities per player** — duplicates progression and breaks on party
  changes. Rejected.

## References

- [`../shrinkonauts/base-game/adr/0009-fixed-verbs-themed-abilities.md`](../shrinkonauts/base-game/adr/0009-fixed-verbs-themed-abilities.md)
- [`../shrinkonauts/base-game/adr/0016-local-coop-p0.md`](../shrinkonauts/base-game/adr/0016-local-coop-p0.md)
- [`../shrinkonauts/base-game/adr/0018-keyboard-first-input-rebinding.md`](../shrinkonauts/base-game/adr/0018-keyboard-first-input-rebinding.md)
- [`0040-dynamic-prop-state-softlock-contract.md`](0040-dynamic-prop-state-softlock-contract.md)
