# Level 03 — Nerve Forest (M1.5 Signal Ferry)

**Status:** M1.5 playable proof (`draft` in `level.json`)
**Pack:** `anatomy-reflex`
**Objective:** OBJ-2 — trace a reflex signal from receptor to muscle
**Concepts:** CON-3 neuron structure, CON-4 synapse, CON-5 sensory/motor
pathways, CON-6 muscle effector, CON-7 reflex arc

## Player-facing goal

The reflex signal is running backwards. Talk to the Neuron Keeper, scan the
glowing structures, carry the tracer across the cleft, place it in the receptor
that matches its shape, and pulse from the presynaptic terminal. The matching
receptor lets the signal cross the cleft and opens the exit to the Muscle
Effector.

## Flow

```text
spawn (checkpoint-entry)
  → agent-neuron          dlg-neuron-01 (linear nodes + one choice)
      ├─ correct choice reveals CON-3, CON-4, CON-5 and map-nerve-forest
      └─ wrong choice retries the check node
  → scan targets          CON-3 … CON-7 (optional)
  → tracer-prop           P2 picks up the tracer (solo: P1 uses G)
  → bridge / cleft        carry it across
  → receptor-a / b        place it; only receptor-a accepts the triangle
  → pulse-terminal        P1 pulses (solo: P1 has both roles)
  → gate-ferry            opens, grants signal-dash, reveals map-muscle-effector
  → exit-to-muscle        debrief for OBJ-2 → evidence export
```

M1.5 treats this level as both the start and end of the pack. The exit still
names `04-muscle-effector`; validation reports that forward reference as a
warning rather than a failure.

## Room facts

| Property | Value |
| --- | --- |
| Room | `room-nerve-forest`, 40 × 23 tiles at 32 px |
| Background | `bg.nerve_forest`, four parallax layers |
| Spawns | P1 `(3, 20)`, P2 `(5, 20)` |
| Checkpoint | `checkpoint-entry` at `(4, 20)` |
| Bridge | row 18, columns 18–21; steps at row 19 |
| Tracer | `tracer-prop` at `(12, 19)` |
| Receptors | `receptor-a` (triangle) at `(28, 20)`, `receptor-b` (circle) at `(32, 20)` |
| Terminal | `pulse-terminal` at `(8, 20)` |
| Exit | `exit-to-muscle` at `(37, 19)`, locked by `puzzle-ferry-01` |
| Tether | `off` for this puzzle; the room is one screen wide |

Co-op is additive: P1 pulses, P2 carries and places. Solo gives P1 both roles,
so the same solution is serialised by one body. `P` toggles P2 at a checkpoint.

## Controls

| Player | Move | Jump | Scan | Pulse | Carry | Throw | Interact | Dash |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | `A` / `D` | `W` or `Space` | `Q` | `F` | — | — | `E` | `Shift` |
| P2 | `←` / `→` | `↑` | `.` | — | `'` | `;` | `,` | `/` |
| Solo | `A` / `D` | `W` or `Space` | `Q` | `F` | `G` | `H` | `E` | `Shift` |

Shared: `P` player 2, `Tab` map, `C` concept log, `Esc` pause/close, `M` mute.

## Authoring notes

- The puzzle contract is in `puzzle.json`; the room entities live in `room.json`.
- Receptors are visual sockets. The puzzle's `rect` and `snap` values must match
  the room pixel coordinates.
- The tracer is two entities: `body-tracer` (physics) and `tracer-prop`
  (identity). Puzzle nodes reference the prop entity.
- A wrong receptor records a diagnostic counter and keeps the tracer
  retrievable. Out-of-bounds props return to spawn.
- The debrief is the explanation evidence; the puzzle is the performance
  evidence. `gate-nerve-01` is no longer loaded by this level.
- Validation warns about `04-muscle-effector` and the two future map edges;
  these are intentional forward references for the one-level slice.
