# Vault documentation follow-up

**Status:** pending, 26 October 2026  
**Owner:** Snorre  
**Constraint:** `docs/shrinkonauts` is a symlink into the Obsidian vault. M1.5
close-out deliberately did not write through it. This file records the exact
updates to apply when the vault is edited directly.

The implementation and the new ADRs live outside the vault:

- `docs/adr-m1.5/0034–0045`
- `docs/m1.5/README.md`
- `docs/m1.5/authoring.md`

ADR-0034–0041 were not edited. ADR-0042–0045 are new close-out records.

## Pending vault updates

| Vault path | What must change |
|---|---|
| `requirements.md` | Puzzle activation modes, on-demand hints, pulse cooldown, hazard respawn, and the content-version recovery rule. |
| `base-game/implementation-plan.md` | Record M1.5 close-out, the new verification counts/commands, and any M2 impact of activation and hazards. |
| `base-game/level-authoring.md` | Add `zoneEnter`/`interact` activation examples, the `off` one-screen guard, hazard authoring, and hint/cooldown surfaces. |
| `base-game/contracts/pack-schema.md` | Document `hazard` sizing via `components.body`, interact activation entity references, and tether-span validation. |
| `base-game/adr/0009-fixed-verbs-themed-abilities.md` | Amend the M1.5 note if the vault copy still describes pulse/carry as planned rather than implemented. |
| `base-game/adr/0010-behavior-registry-no-pack-scripting.md` | Amend the M1.5 note for the activation lifecycle and hazard sensors. |
| `base-game/adr/0011-concept-gates-knowledge-progression.md` | Note that the ferry uses the puzzle assessment source and the concept-gate engine stays for M2. |
| `base-game/adr/0015-no-fail-state-checkpoint-retry.md` | Note hazard checkpoint respawn as an implemented recovery path. |
| `base-game/adr/0016-local-coop-p0.md` | Note solo union, co-op activation, and hazard respawn behaviour. |
| `base-game/adr/0017-coop-camera-tether.md` | Note the puzzle-scoped tether policy and the 1280 × 720 `off` span guard. |
| `base-game/adr/0025-scope-and-non-goals.md` | Note the M1.5 close-out scope: activation, hints, cooldown, hazards, save recovery, and physics tests; no new content. |
| `learning-design-brief.md` | Update the evidence wording if it still describes gate attempts instead of puzzle solve plus debrief. |
| `syllabus.md` / mapping notes | Confirm EV-2 is puzzle solve plus diagnostic counters; no new objective or concept ids were added. |
| `IMPLEMENTATION.md` | Update the module map, verification commands, test count, and the save load-result contract. |

## M1.5 facts to propagate

- Activation: `roomStart` at entry; `zoneEnter` through a zone node rect;
  `interact` through a room entity prompt. Only activated puzzles tick/save.
- Tether: room default `normal`; first active puzzle override; `off` requires
  puzzle geometry inside 1280 × 720.
- Hints: pause-menu button, HUD line, `hint_used` event; index not saved.
- HUD: `Pulse: ready` or remaining cooldown seconds.
- Hazards: static sensors, `HAZARD` category, player-only, checkpoint respawn,
  puzzle/prop state persists.
- Save: same-pack version mismatch returns the parsed run; runtime resets to
  checkpoint and keeps progression/evidence. V1 still resets.
- Physics: focused tests now cover force targets, pushing, stacking, rotation,
  throw, L1 layers, hazard respawn, and stretch.
