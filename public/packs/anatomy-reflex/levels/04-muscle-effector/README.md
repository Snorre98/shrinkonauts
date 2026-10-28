# Level 04 — Muscle Effector (M2 Endplate Ferry)

**Status:** M2 implementation (`validated` in `level.json`; human playtest pending)
**Pack:** `anatomy-reflex`
**Objective:** OBJ-2 — trace the signal from receptor to muscle
**Concepts:** CON-4 synapse, CON-6 muscle effector
**Card facts:** NERV-02#1, #2, #5 (core); #3 in the optional advanced dialogue line
**Puzzle:** `puzzle-endplate-ferry`
**Win:** `gateOpen gate-muscle`
**Transition:** [`ADR-0046`](../../../../../docs/adr-m1.5/0046-level-transitions.md)

> The feedback/effect layer now provides authored labels, beats, persistent
> state surfaces, socket-anchored effects, tile visuals, and the ACh clearance
> state. Physical gate collision, final art, and final audio remain out of
> scope; see [`docs/puzzle-engine/`](../../../../../docs/puzzle-engine/README.md).

## Player-facing goal

The muscle is waiting, but the release window is closed and the ACh packet is
stuck at the vesicle dock. Talk to the Muscle Effector, start the ferry at the
motor terminal, step on the terminal plate to open the Ca²⁺ window, carry the
ACh packet across the cleft, place it on the nicotinic receptor, and pulse the
terminal. The receptor binds, the muscle gate latches, and the exit to the
Reflex Core opens.

This is the ferry pattern moved from 03 to its anatomical home: a presynaptic
terminal releases a chemical message, the message crosses a cleft, a specific
postsynaptic receptor accepts it, and the muscle responds. 03 Node Run now
teaches threshold, all-or-none, and one-way conduction; 04 teaches the synapse
and the neuromuscular junction.

## Flow

```text
spawn (checkpoint-muscle-entry)
  → agent-muscle         dlg-muscle-01 (cleft, Ca²⁺, ACh, nicotinic receptor, AChE)
      └─ correct choice reveals CON-4 and CON-6
  → motor-terminal       interact activation (puzzle starts)
  → pad-terminal         terminal plate starts the Ca²⁺ timer
  → ca-gate              opens when the timer elapses (non-latched)
  → ach-packet           P2 carries the packet across the cleft
  → nicotinic-receptor   place the packet in the matching socket
  → motor-terminal       P1 pulses; the receptor binds
  → muscle-gate          Ca²⁺ gate + receptor relay opens the latched gate
  → exit-to-reflex-core  debrief for OBJ-2 → next level or evidence export
```

## Puzzle rules

1. The puzzle is inactive until a player interacts with `motor-terminal`.
   Activation applies the `off` tether policy.
2. Stepping on `terminal-plate` starts `ca-timer`. When it elapses,
   `ca-gate` opens. The gate is not latched and is not a physical door.
3. P2 picks up the `ach-packet` from the vesicle dock and carries it across the
   cleft. The packet is an abstraction for the released chemical message, not a
   literal vesicle.
4. Placing the packet on `nicotinic-receptor` makes the receptor occupied.
   `wrong-receptor` is a shape-mismatched socket; a pulse there rejects the
   packet and increments `wrongReceptor`, but the packet stays retrievable.
5. P1 pulses `motor-terminal`. The pulse binds the packet to the nicotinic
   receptor, starts `ache-timer`, and makes the receptor an active input to
   `response-relay`.
6. `response-relay` requires **both** `ca-gate` and the bound receptor. When
   both are active it opens `muscle-gate`, which is latched. The win predicate
   is `gateOpen muscle-gate`.
7. `ache-timer` elapses after the response, resets the Ca²⁺ timer, closes
   `ca-gate`, and clears the ACh packet. `muscle-gate` stays latched. The timer
   cannot undo the solve.
8. The clearance link is `ache-timer → ach-packet` type `clear`. The packet
   enters `cleared`: its body and collision are removed and its sprite is
   hidden, while the persistent `ACh packet cleared` surface remains.
9. Reset clears the graph, restores the packet to the dock, and returns the
   Ca²⁺ gate, receptor, timers, and relay to their initial state. Players stay
   where they are; this is the existing M1.5 reset behaviour.

AChE open-before-close is the recovery invariant: `evaluateGates` checks `open`
before `close`, so an elapsed Ca²⁺ timer always opens the gate. AChE resets the
Ca²⁺ timer and closes the gate only as the clearance beat; pressing the plate
again re-arms the window. If the receptor was bound before the window opened,
the bound receptor remains the response input and the later Ca²⁺ window can
still complete the relay. Reset restores the cleared packet.

The relay is the implementation safeguard. Because the engine's puzzle gates
are logic/visual state and have no collision, `ca-gate` cannot physically block
the bridge. The relay makes the Ca²⁺ step necessary for the **win**: a pulse
that binds the receptor before the Ca²⁺ window leaves `muscle-gate` closed
until the terminal plate starts the timer and `ca-gate` opens. The engine does
not enforce the intended temporal order; the dialogue, hints, and solution
trace do.

## Room facts

| Property | Value |
| --- | --- |
| Room | `room-muscle-effector`, 40 × 22 tiles at 32 px (1280 × 704) |
| Background | `bg.muscle_endplate`, four parallax placeholder layers |
| Spawns | P1 `(3, 20)`, P2 `(5, 20)` |
| Checkpoint | `checkpoint-muscle-entry` at `(4, 20)` |
| Agent | `agent-muscle` at `(6, 20)` |
| Terminal | `motor-terminal` at `(9, 20)`; visible plate `pad-terminal` at `(11, 20)`; sensor rect x 336–400, y 600–648 |
| Packet | `ach-packet` / `body-ach-packet` at `(13, 20)` |
| Ca²⁺ gate | `ca-gate` at `(14, 20)` |
| Cleft | visible scan label at `(16, 18)`; the floor is continuous |
| Receptors | nicotinic at `(22, 20)` (snap 720, 620); wrong socket at `(26, 20)` (snap 848, 620) |
| Muscle gate | `muscle-gate` at `(33, 20)`; lever decor `(35, 19)` |
| Exit | `exit-to-reflex-core` at `(36, 19)`, locked by `puzzle-endplate-ferry` |
| Tether | `off`; puzzle geometry spans about 768 × 40 px, inside 1280 × 720 |

Visible pads and labels are `scanTarget` entities aligned with the puzzle
sensors. The engine does not render plate/zone sensor rects, and puzzle gates
have no collision bodies. Gate state now projects to persistent surfaces and
cosmetic bursts; these are presentation, not physical doors.

## Evidence and debrief

- `puzzle_solved` filtered by `puzzle-endplate-ferry`, required for OBJ-2;
  syllabus rule **EV-8**.
- `debrief_answered` filtered by `prompt-obj-2`, required for OBJ-2; this is
  the shared OBJ-2 prompt. The 03 Node Run rule **EV-2** and debrief rule
  **EV-7** remain required, so OBJ-2 is met only after both puzzles and the
  debrief.
- The 03 debrief shows OBJ-2 as partial until 04 is solved. That is expected:
  EV-8 is not recorded yet. The 04 debrief shows the completed evidence.
- The runtime clears per-level debrief answers on level entry, so the 04
  debrief requires a fresh answer even though it uses the same prompt ID as 03.
  `finishDebrief` still refuses to leave the debrief while the 04 answer is
  empty.
- Solve counters: `pickups`, `drops`, `placements`, `pulses`, `wrongReceptor`,
  `wrongSide`, `resets`. Hint use is a separate `hint_used` learning event.
- Optional scans: `pad-terminal`, `scan-cleft`, and `scan-receptor` (CON-4);
  `scan-muscle` (CON-6). The dialogue also reveals CON-4 and CON-6.

Suggested debrief answer for the playtest: "The action potential opens Ca²⁺
channels at the terminal; Ca²⁺ triggers vesicle release. ACh crosses the cleft
and binds nicotinic receptors on the muscle, which depolarises the muscle and
causes contraction. Acetylcholinesterase breaks down ACh to end the signal."

The design suggested a per-level `prompt-obj-2-nmj`. The engine has no
per-level debrief prompt override, so this chunk uses `prompt-obj-2` and records
the caveat rather than adding a curriculum/schema change without an ADR.

## Co-op and solo

- **Co-op:** P1 operates the terminal plate and pulse; P2 carries and places
  the ACh packet. The roles are additive. Either player can activate the
  puzzle and scan.
- **Solo:** P1 uses the solo union. Step on the terminal plate, wait for the
  Ca²⁺ window, pick up and carry the packet, place it on the nicotinic
  receptor, then pulse the terminal. The plates and timer do not require a
  second body.
- **No co-op-only route:** solo completes the same sequence.
- **Tether:** `off`; the room is one screen and the puzzle geometry fits the
  1280 × 720 guard.

## Controls

| Player | Move | Jump | Scan | Interact | Pulse | Carry | Throw |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | `A` / `D` | `W` or `Space` | `Q` | `E` | `F` | — | — |
| P2 | `←` / `→` | `↑` | `.` | `,` | — | `'` | `;` |
| Solo | `A` / `D` | `W` or `Space` | `Q` | `E` | `F` | `G` | `H` |

Shared: `P` player 2 at a checkpoint, `Tab` map, `C` concept log, `Esc`
pause/close, `M` mute.

## Authoring notes and deviations

- `puzzle-endplate-ferry` is now a 1.1 puzzle document because it uses the
  `clear` link action. The engine feedback layer is content-driven by the
  `feedback` block in `level.json`; no per-level runtime branch was added.
- The Ca²⁺ gate is logic/visual state, not a collision body. The relay enforces
  the Ca²⁺ requirement for the win, but the player can walk across the cleft
  before the gate opens. The dialogue and hints state the intended order; the
  README records the gap.
- The AChE timer resets the Ca²⁺ timer, closes the Ca²⁺ gate, and clears the ACh
  packet. The packet body/collision are removed and the sprite hides; the
  persistent `ACh packet cleared` surface and the `fx.ach.dissolve` ring/burst
  remain visible. Reset restores the packet at the dock.
- A pulse is broadcast to both receptors. The wrong receptor can emit an
  explicit empty/wrong-socket cue; the nicotinic bind is a separate persistent
  state, so the two outcomes are not collapsed into one toast.
- Puzzle labels come from the level feedback block, so the HUD uses "ACh packet"
  and "Nicotinic receptor" rather than the room entity's longer fallback label.
- `ca-gate` and `muscle-gate` are `puzzleGate` entities without collision. Gate
  state projects to persistent surfaces and cosmetic bursts/waves. The lever is
  decor; the exit is the actual level transition.
- The exit points to `05-reflex-core`, which is not authored in this chunk.
  `pack:validate` reports the expected forward reference. The pack's
  `endLevelId` is 04, so finishing the 04 debrief completes the slice even
  though `nextLevelIds` keeps the future 05 reference. Solving the puzzle also
  reveals `map-reflex-core` as a forward map reward; until 05 exists, the map
  shows the existing fallback card at (0,0) rather than dropping the reward.
- 03 → 04 is playable through ADR-0046: the 03 debrief finishes, the runtime
  loads 04, and the platform restarts the room scene from the new room
  document. The transition autosaves under the 04 level id.
- `npm run pack:smoke -- --level 04-muscle-effector` accepts the flag but the
  script still runs the whole anatomy pack. The full smoke now covers 04
  through the 03 → 04 transition.
- Human solo/co-op playtesting has not been performed. `level.json` records
  `playtestedSolo: false` and `playtestedCoop: false`.
- Documentation outside this chunk is stale: the top-level `README.md` and
  `IMPLEMENTATION.md` still describe the older M1 slice, and the untracked
  `docs/m3/asset-requirements.md` still assumes the ferry assets. Those files
  were not edited. The public `public/syllabi/anatomy-reflex.json` is the
  runtime source; the vault syllabus and the EV-5/EV-6 numbering conflict were
  not edited.

## M1.8 material proof

The room is fully materialized for M1.8: muscle walls/floor use `edge`
autotiling and the entrance strip uses membrane `corner` autotiling. The
`muscle-gate` carries a world-space `muscle-fibers` overlay that shares phase
with the muscle floor. The near background layer uses the same pattern in
world space. Materials are visual only; collision comes from `layers.tiles`.
Human visual review is pending.

## Remaining implementation gaps (M2 chunk boundary)

- Full M2 is not implemented. `05-reflex-core`, the Silicon fixture,
  `01-bone-gate`, and `02-joint-chamber` remain unauthored.
- The 04 exit / next-level / map-edge references to `05-reflex-core` are
  expected forward-reference warnings.
- The Ca²⁺ bridge has no physical collision; the ACh packet now has a visual
  clear plus a persistent cleared surface. The shared `prompt-obj-2` still means
  03 shows OBJ-2 as partial. These are recorded deviations, not hidden claims.
- Human playtesting and the optional advanced NERV-02#3 debrief are pending.
  The required dialogue includes the receptor-specificity line as optional
  reading; it is not a required assessment.

## Verification

```text
npm test
npm run pack:validate
npm run pack:smoke -- --level 04-muscle-effector
npm run pack:map
npm run build
git diff --check
npm run smoke:e2e
```

`pack:validate` is expected to report 1/5 objectives and 4/8 concepts (CON-4
and CON-6 added), plus the 04→05 forward references and the unauthored
objectives/concepts. Those are not failures.
