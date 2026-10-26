# M1.5 — Puzzle Foundation and Signal Ferry

**Status:** implemented foundation, 26 October 2026  
**Scope:** typed puzzle dataflow, Matter.js prop physics, per-player abilities,
save v2, puzzle-as-assessment, and the Signal Ferry proof.

## What shipped

- `src/puzzle/` — pure graph evaluator, validator, and solution replay harness.
- `src/pack/parse-puzzle.ts` — pack parser for puzzle documents.
- `src/world/physics.ts` — Matter.js boundary, static tile runs, dynamic
  players, props, carry constraints, and tether constraints.
- `src/world/simulation.ts` — the existing room simulation API backed by
  Matter.js, with prop lifecycle and fixed-step cues.
- `src/game/runtime.ts` — per-player action routing, puzzle ticking, rewards,
  evidence, reset, and save v2 snapshots.
- `public/packs/anatomy-reflex/levels/03-nerve-forest/` — reworked room,
  `puzzle.json`, and puzzle-driven level evidence.
- `docs/adr-m1.5/0034–0041` — the accepted M1.5 decisions.

## Verification

```sh
npm test
npm run pack:validate
npm run pack:smoke
npm run smoke:e2e
npm run build
```

Current tests cover:

- both puzzle fixtures: ferry and relay/plate/timer/counter;
- invalid links, win references, and relay cycles;
- co-op ferry solve, solo ferry solve, wrong-receptor retry;
- mid-carry save/restore, reset, P2 join/leave, dash unlock;
- prop carry/place/dock/reset, out-of-bounds return, tether policy;
- dialogue, scan, debrief, evidence export, and keyboard/browser flow.

## Controls

| Player | Move | Jump | Dash | Scan | Pulse | Carry | Throw | Interact |
|---|---|---|---|---|---|---|---|---|
| P1 | A/D | W or Space | Shift | Q | F | — | — | E |
| P2 | Arrows | Up | / | . | — | ' | ; | , |
| Solo | A/D | W or Space | Shift | Q | F | G | H | E |

P2 is optional. In solo, P1 receives the union of `pulse` and `carry`.

## Known follow-ups

- Throw content and rotation/stacking are implemented at the physics layer but
  the ferry does not require them.
- Save v1 is reset rather than migrated, by design (ADR-0041).
- Accessibility remapping for the four-key P2 cluster remains out of scope.
- The concept-gate engine is retained for M2 objectives that are genuinely
  knowledge checks.
