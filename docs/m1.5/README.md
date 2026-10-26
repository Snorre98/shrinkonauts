# M1.5 — Puzzle Foundation and Signal Ferry

**Status:** close-out complete, 26 October 2026
**Scope:** typed puzzle dataflow, Matter.js prop physics, per-player abilities,
save v2, puzzle-as-assessment, and the Signal Ferry proof.

## What shipped

- `src/puzzle/` — pure graph evaluator, validator with activation and
  tether-span checks, and solution replay harness.
- `src/pack/parse-puzzle.ts` — pack parser for puzzle documents.
- `src/world/physics.ts` — Matter.js boundary, static tile runs, dynamic
  players, props, carry constraints, tether constraints, and hazard sensors.
- `src/world/simulation.ts` — the room simulation API backed by Matter.js, with
  prop lifecycle, hazard checkpoint respawn, and fixed-step cues.
- `src/game/runtime.ts` — per-player action routing, puzzle activation
  (`roomStart`, `zoneEnter`, `interact`), puzzle ticking, hints, rewards,
  evidence, reset, save v2, and recoverable content-version restore.
- `src/save/index.ts` — v2 snapshots plus a version-mismatch result that can
  reset to checkpoint without losing progression or evidence.
- `src/ui/` — per-player abilities, carry state, pulse cooldown, puzzle hint
  line, pause-menu hint control, and reset action.
- `public/packs/anatomy-reflex/levels/03-nerve-forest/` — reworked room,
  `puzzle.json`, and puzzle-driven level evidence.
- `docs/adr-m1.5/0034–0045` — the accepted M1.5 decisions.

## Verification

```sh
npm test
npm run pack:validate
npm run pack:smoke
npm run smoke
npm run smoke:e2e
npm run build
```

Current tests cover:

- both puzzle fixtures: ferry and relay/plate/timer/counter;
- activation modes, missing activation references, and the `tether: "off"`
  one-screen span guard;
- invalid links, unknown nodes, win references, relay cycles, and unreachable
  solution traces;
- co-op ferry solve, solo ferry solve, wrong-receptor retry, wrong-side
  feedback, and diagnostic counters in exported evidence;
- mid-carry, mid-air, placed, docked, and solved save/restore;
- content-version mismatch reset to checkpoint with progression retained;
- reset, P2 join/leave, dash unlock, hints, pulse cooldown, and hazard respawn;
- prop carry/place/dock/reset, out-of-bounds return, tether policy, stretching,
  pushing, stacking, rotation, throw, and L1 collision layers;
- dialogue, scan, debrief, evidence export, and keyboard/browser flow.

## Controls

| Player | Move | Jump | Dash | Scan | Pulse | Carry | Throw | Interact |
|---|---|---|---|---|---|---|---|---|
| P1 | A/D | W or Space | Shift | Q | F | — | — | E |
| P2 | Arrows | Up | / | . | — | ' | ; | , |
| Solo | A/D | W or Space | Shift | Q | F | G | H | E |

P2 is optional. In solo, P1 receives the union of `pulse` and `carry`.

## Known follow-ups

- Throw, rotation, and stacking are implemented and tested at the physics layer,
  but the ferry does not require them. That content remains on the M1.5 cut
  line.
- Save v1 is reset rather than migrated, by design (ADR-0041).
- `contentVersion` currently mirrors `pack.version`; there is no independent
  content hash yet (ADR-0045).
- Accessibility remapping for the four-key P2 cluster remains out of scope.
- The concept-gate engine is retained for M2 objectives that are genuinely
  knowledge checks.
- Vault documentation is intentionally untouched. The exact pending vault
  updates are listed in [`vault-docs-todo.md`](vault-docs-todo.md).
