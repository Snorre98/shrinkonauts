# ADR-0001: Keep compact modules and public APIs as the base model

Status: Accepted

## Context

The M2 design exposed several engine gaps: gates cannot block movement, props
cannot be released or cleared, links cannot express causal order, debrief
prompts are derived only from objectives, and the map cannot enter optional
side levels. The upgrade could be implemented as level-specific code, a
general scripting layer, or a set of capabilities inside the existing module
structure.

The repository already has a strict module model. `puzzle` is a pure dataflow
evaluator; `pack` parses and validates content; `world` owns Matter.js and
Phaser; `game` orchestrates; `save` owns the run snapshot; `curriculum` owns
evidence and debrief prompts; `ui` owns DOM overlays. The M1.5 boundary tests
already enforce an acyclic, public-API-only dependency graph.

## Decision

The upgrade keeps the existing compact-module, sealed-by-default base model.

- No new scripting layer and no executable content in puzzle documents.
- Every new capability is added to the module that already owns the concern:
  - `puzzle` owns gate, prop, and link state semantics;
  - `pack` owns schema parsing and validation;
  - `world` owns Matter.js gate bodies, prop bodies, and scene presentation;
  - `game` owns synchronization, feedback routing, debrief prompt selection,
    and side-level travel;
  - `save` owns snapshot persistence;
  - `curriculum` owns prompt fallback and evidence;
  - `ui` owns the map travel controls.
- New operations are exposed only through each module's documented public API
  in [`contracts/module-boundaries.md`](../contracts/module-boundaries.md).
- The dependency graph remains acyclic and public-API-only. `puzzle` never
  imports `world`, `game`, Phaser, Matter.js, the DOM, or pack loading.

## Consequences

**Easier:**

- New behavior is testable at the pure `puzzle` boundary and at the
  `GameRuntime` integration boundary.
- Content authors get data-only capabilities; developers get stable seams.
- The existing boundary tests and module ownership stay valid.

**Harder:**

- Some capabilities need coordinated changes in `puzzle`, `pack`, `world`,
  `game`, `save`, and `ui`. A change is never confined to one file.
- The public API surface grows; every operation must be documented and tested.

**Constrained:**

- No level-specific engine branches.
- No puzzle callbacks, scripts, or arbitrary code.
- No cross-module access to internal state.

## Alternatives considered

- **A new puzzle-engine module** — duplicates `puzzle`/`pack`/`world` seams and
  creates a parallel state model. Rejected.
- **A general script/event language** — contradicts the accepted declarative
  dataflow contract and ADR-0034. Rejected.
- **Level-specific code paths** — makes each new puzzle a maintenance burden
  and breaks the level-factory promise. Rejected.
- **A single monolithic orchestrator** — loses testable pure state and violates
  the existing module boundaries. Rejected.
