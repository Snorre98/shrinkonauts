# Level 03 — Nerve Forest

**Status:** M1 vertical slice (`draft` in `level.json`)  
**Pack:** `anatomy-reflex`  
**Objective:** OBJ-2 — trace a reflex signal from receptor to muscle  
**Concepts:** CON-3 neuron structure, CON-4 synapse, CON-5 sensory/motor
pathways, CON-6 muscle effector, CON-7 reflex arc

## Player-facing goal

The reflex signal is running backwards. Talk to the Neuron Keeper, scan the
glowing structures, then reorder the reflex pathway at the Signal Gate. Solving
the gate unlocks `signal-dash` and opens the exit to the Muscle Effector.

## Flow

```text
spawn (checkpoint-entry)
  → agent-neuron          dlg-neuron-01 (linear nodes + one choice)
      ├─ correct choice reveals CON-3, CON-4, CON-5 and map-nerve-forest
      └─ wrong choice retries the check node
  → scan targets          CON-3 … CON-7 (optional, but supports the gate)
  → gate-nerve-01         sequence puzzle; solve unlocks signal-dash
  → exit-to-muscle        debrief for OBJ-2 → evidence export
```

M1 temporarily treats this level as both the start and end of the pack. The
exit still names `04-muscle-effector`; validation reports that forward reference
as a warning rather than a failure.

## Gate answer

`gate-nerve-01` is a `sequence` gate. Correct order:

```text
Receptor → Sensory neuron → Spinal cord → Motor neuron → Muscle
```

A wrong submission records `gate_failed`; the correct submission records
`gate_solved`, grants `signal-dash`, reveals `map-muscle-effector`, and plays
the unlock cue.

## Room facts

| Property | Value |
| --- | --- |
| Room | `room-nerve-forest`, 40 × 23 tiles at 32 px |
| Background | `bg.nerve_forest`, four parallax layers |
| Spawns | P1 `(3, 20)`, P2 `(5, 20)` |
| Checkpoint | `checkpoint-entry` at `(4, 20)` |
| Exit | `exit-to-muscle` at `(37, 19)`, gated by `gate-nerve-01` |
| Tether | 560 px; P2 is pulled toward P1 when separated |

Co-op is supported: either player can talk, scan, open the gate, or cross the
exit. `P` toggles P2 at a checkpoint. Solo play is the same level with P2
inactive.

## Controls

| Player | Move | Jump | Interact | Scan | Dash |
| --- | --- | --- | --- | --- | --- |
| P1 | `A` / `D` | `W` or `Space` | `E` | `Q` | `Shift` |
| P2 | `←` / `→` | `↑` | `,` | `.` | `/` |

Shared: `P` player 2, `Tab` map, `C` concept log, `Esc` pause/close, `M` mute.

## Authoring notes

- All assets are placeholder-first logical IDs; no final art or audio is
  required to play the slice.
- Dialogue is linear with one choice. Conditional node skipping is deferred;
  the `retry` node loops back to `check`.
- The scan targets are optional. The gate is the required evidence source for
  OBJ-2; the debrief answer is the teach-back.
- Validation currently warns about `04-muscle-effector`, the next level, and map
  edges to `map-joint-chamber` / `map-muscle-effector`. These are intentional
  forward references for the one-level slice.
