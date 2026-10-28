# Pre-game hub — ADR domain

**Status:** Proposed, 2026-10-28  
**Owner:** Snorre  
**Milestone:** [`../m1.9/README.md`](../m1.9/README.md)  
**Scope:** app shell, bathroom hub, pack catalog, per-pack saves, launch
transition, and the seam reserved for M4's online lobby.

This domain is separate from the puzzle-engine, M1.5, and online ADR sets. It
does not rewrite accepted records.

## Index

| # | Decision | Status |
|---|---|---|
| [0058](0058-app-shell-pre-game-phase.md) | Pre-game bathroom hub as an app-shell phase | Proposed |
| [0059](0059-pack-catalog-per-pack-saves.md) | Pack catalog and per-pack save slots | Proposed |

## Relationship to other decisions

- ADR-0009–0017: feedback, effects, materials, and atlases remain gameplay
  concerns; the hub only consumes the theme/asset pipeline.
- ADR-0034–0046: GameRuntime, save, and level transitions remain the gameplay
  authority. `start({ resume, activeP2 })` is the only runtime change.
- ADR-0047–0056: M4 online co-op adds the lobby implementation behind the hub's
  disabled multiplayer section. The hub placeholder is deliberately stateless.
- ADR-0051: host-owned save/evidence; the hub shows Continue only for local
  play; M4 makes the guest save a no-op.

## Acceptance

M1.9 is complete when the hub is the default boot, Anatomy starts end-to-end,
Silicon is visible but gated, per-pack saves migrate, the launch transition is
skippable and reduced-motion-aware, return-to-hub works, and the M1/M1.75
gameplay tests still pass. M4 completes the online portion.
