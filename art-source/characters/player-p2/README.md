# Player P2 source sheets

Approved P2 concept from ADR-0065: bone suit, joint-cyan visor and backpack
tank, nerve-amber chest accent, teal/bone-shadow joints, ink outline, and
bone-shadow grime. This supersedes the orange-suit P2 concept in ADR-0064.

## Sources

| Folder | Action | Grid | Frames | Frame size | Sheet size | Frame duration |
|---|---|---|---:|---:|---|---:|
| `walk/` | Walk | 6 × 6 | 36 | 248 × 352 | 1488 × 2112 | 76 ms |
| `jump/` | Jump | 6 × 6 | 36 | 304 × 528 | 1824 × 3168 | 80 ms |

The jump sheet contains idle, crouch, takeoff, air, landing, and recovery.
Runtime clips use frames 6–17 (jump), 18–27 (fall), and 28–35 (land).

`p2.png` is a single high-resolution reference frame, not a runtime asset.

## Status

- **Approved:** 2026-10-31.
- **Runtime:** POC walk/jump/fall/land sheets are built by
  `npm run art:build-player` and live in
  `public/packs/anatomy-reflex/shared/sprites/`.
- **Working data:** see [`working/README.md`](working/README.md).
- **Prompt / model / seed:** TBD.
- **Ludo plan / licence:** TBD.

These are immutable source exports. Do not edit them; make working copies under
`working/`.
