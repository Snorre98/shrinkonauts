# Shrinkonauts — current design

**Status:** 2D exploration-platformer/gamepack pivot · base-game docs v0.2 · 26 October 2026  
**Current source:** [`base-game/`](base-game/) · the GDD (Canva/PDF)  
**Implementation plan:** [`base-game/implementation-plan.md`](base-game/implementation-plan.md)  
**Historical design:** [`DESIGN.md`](DESIGN.md)  
**Learning design:** [`LEARNING-DESIGN.md`](LEARNING-DESIGN.md)  
**Owners:** Snorre (video/architecture) · Henrik and Hanna (theory) · Johannes and Marie (GDD in Canva)

> A 2D exploration platformer learning adventure. A tiny repair crew dives into a
> **gamepack** — a simulated system on a cartridge — and repairs it from the
> inside. The first pack is anatomy; the first slice is the knee-jerk reflex
> arc. The body is the level; the cells are the agents; understanding the system
> is the key. Every system is a puzzle.

## What lives here

| Path | What it is |
|---|---|
| [`base-game/`](base-game/) | **The current learning + architecture source.** Syllabus, requirements, architecture, implementation plan, 33 ADRs, contracts, behaviours, level-authoring workflow, traceability, glossary, asset manifests, and pack/level templates. |
| `DESIGN.md` | Historical design record v0.7. The 3D open-world/live-action sections are superseded by `base-game/` and the GDD. |
| [`LEARNING-DESIGN.md`](LEARNING-DESIGN.md) | Reading notes and open questions on the GBL readings; not a proposal, decision record, or theory draft. |
| [`archive-DEPRECATED/video/storyboard-v0.md`](../archive-DEPRECATED/video/storyboard-v0.md) | Historical first-pass trailer storyboard: 20 panels, live-action intro, 3D body. Superseded by the capture plan. |
| `notes/raw-idea-video.md` | The raw original idea. Source material, not a script. |
| `07-references.md` | Working reference list for the theory section. Prune to what is actually used. |

`base-game/syllabus.md` is the learning contract. `base-game/architecture.md` is the engineering backbone. `DESIGN.md` is history, not the current source.

## What is not here yet

- The game code/scaffold; the base-game contracts and templates are the build specification.
- The new introduction, theory, GDD, finished video kit, asset list, reflection, and final LEAGUE appendix.
- Theory: Henrik and Hanna.
- GDD: Johannes and Marie (Canva recommended).
- Video kit: Snorre (capture plan; storyboard v0 is historical).

## The old pack

The v0.1 rescue-pod concept is archived at
[`../archive-DEPRECATED/shrinkonauts-v0.1/`](../archive-DEPRECATED/shrinkonauts-v0.1/).
It is history, not the current concept.
