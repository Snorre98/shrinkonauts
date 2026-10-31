# Traceability matrix

Rows are ADRs. Columns are arc42 sections, behavior contracts (Gherkin), precise
contracts, quality scenarios, and implementation status. Every ADR maps to at
least one arc42 section; every quality scenario maps to at least one behavior
contract. `contracts/module-boundaries.md` is the required base-model row;
ADR-0001 maps to it and to §2/§5.2/§8.

Status is implementation status, not decision status. The implementation table
in [`architecture.md`](architecture.md) is the authority where these differ.

| ADR | arc42 section(s) | Behavior contract | Precise contract | Quality scenario | Status |
|---|---|---|---|---|---|
| 0001 | §2, §5.2, §8 | — | module-boundaries | Q3, Q5 | Implemented |
| 0002 | §4, §5.2, §6.1, §8, §10 | physical-gates | state-machine, interface | Q1 | Partial; logical gates implemented, gate bodies deferred |
| 0003 | §5.2, §6.1, §8, §10 | gate-presentation | interface, data-model | Q1, Q5 | Partial; feedback state projection implemented, sprite-swap/body presentation deferred |
| 0004 | §4, §5.2, §6.2, §8, §10 | prop-lifecycle | data-model, state-machine, interface, failure-semantics | Q2 | Partial; `clear`/`cleared` implemented, `locked`/`unlock` deferred |
| 0005 | §4, §5.2, §6.1, §6.6, §8, §10 | causal-links | interface, state-machine, failure-semantics | Q1 | Deferred |
| 0006 | §4, §5.2, §6.3, §8, §10 | per-level-debrief | data-model, interface | Q3, Q5 | Partial; syllabus fallback implemented, overrides deferred |
| 0007 | §4, §5.2, §6.4, §8, §10 | map-travel | data-model, state-machine, failure-semantics, interface | Q2 | Deferred |
| 0008 | §2, §5.2, §8, §10 | schema-compatibility | data-model, failure-semantics, interface | Q3, Q4 | Implemented |
| 0009 | §4, §5.1, §5.2, §6.1, §6.5, §8, §10 | feedback-surfaces | module-boundaries, interface, state-machine | Q5, Q6 | Implemented |
| 0010 | §4, §5.1, §5.2, §6.1, §6.5, §8, §10 | feedback-surfaces | module-boundaries, interface, state-machine | Q6, Q7 | Implemented |
| 0011 | §4, §5.2, §6.5, §6.6, §8, §10 | entity-conversations | interface, data-model, state-machine, failure-semantics | Q4, Q8 | Implemented |
| 0012 | §4, §5.2, §6.1, §6.5, §8, §10 | capability-coverage | interface, module-boundaries, data-model | Q3, Q5, Q9 | Implemented |
| 0013 | §4, §5.2, §6.5, §6.6, §8, §10 | cosmetic-effects | interface, module-boundaries, state-machine, failure-semantics | Q5, Q10 | Implemented |
| 0014 | §2, §4, §5.2, §8, §9, §10 | material-patterns | module-boundaries, data-model, interface | Q3, Q11 | Implemented; animation deferred |
| 0015 | §4, §5.2, §6.1, §8, §10 | material-patterns | data-model, interface, state-machine | Q3, Q11 | Implemented; `wang` deferred |
| 0016 | §4, §5.2, §6.5, §6.6, §8, §10 | material-patterns | module-boundaries, data-model, interface | Q5, Q10, Q11 | Implemented; animation and image/atlas UI patterns deferred |
| 0017 | §2, §5.2, §8, §10 | material-patterns | data-model, interface, module-boundaries | Q4, Q11 | Implemented |

## Behavior contract ↔ quality scenario coverage

| Quality scenario | Behavior contract |
|---|---|
| Q1 persistent timer/gate/receptor state | `feedback-surfaces.feature` |
| Q2 reset/save/restore recovery | `prop-lifecycle.feature`, `schema-compatibility.feature` |
| Q3 data-only authorability and validation | `capability-coverage.feature`, `cosmetic-effects.feature` |
| Q4 backward compatibility | `schema-compatibility.feature`, `entity-conversations.feature` |
| Q5 testability and observability | all behavior contracts |
| Q6 persistent state + transient cue | `feedback-surfaces.feature` |
| Q7 P1/P2 ownership and attribution | `feedback-surfaces.feature` |
| Q8 concurrent entity conversations | `entity-conversations.feature` |
| Q9 descriptor/event coverage | `capability-coverage.feature` |
| Q10 cosmetic effects and reduced motion | `cosmetic-effects.feature` |
| Q11 material/pattern visual language, variants, UI parity | `material-patterns.feature` |

## Behavior contract ↔ ADR coverage

| Behavior contract | ADRs |
|---|---|
| `feedback-surfaces.feature` | 0009, 0010, 0012 |
| `entity-conversations.feature` | 0011 |
| `capability-coverage.feature` | 0012 |
| `cosmetic-effects.feature` | 0013 |
| `material-patterns.feature` | 0014, 0015, 0016, 0017 |
| `physical-gates.feature` | 0002 |
| `gate-presentation.feature` | 0003 |
| `prop-lifecycle.feature` | 0004 |
| `causal-links.feature` | 0005 |
| `per-level-debrief.feature` | 0006 |
| `map-travel.feature` | 0007 |
| `schema-compatibility.feature` | 0008 |
| `material-patterns.feature` | 0014, 0015, 0016, 0017 |

## ADR → contract completeness

| ADR | Primary contract | Implementation plan phase |
|---|---|---|
| 0001 | module-boundaries | 1 |
| 0002 | state-machine, interface | 2, 3 |
| 0003 | interface, data-model | 3 |
| 0004 | data-model, state-machine, interface, failure-semantics | 1, 2, 3 |
| 0005 | interface, state-machine, failure-semantics | 1, 2, 4 |
| 0006 | data-model, interface | 1, 4 |
| 0007 | data-model, state-machine, failure-semantics | 1, 4 |
| 0008 | data-model, failure-semantics | 1, 5 |
| 0009 | module-boundaries, interface, state-machine | 2, 3, 4 |
| 0010 | interface, module-boundaries, state-machine | 4, 5 |
| 0011 | interface, data-model, state-machine | 5 |
| 0012 | interface, module-boundaries, data-model | 3, 8 |
| 0013 | interface, module-boundaries, state-machine, failure-semantics | 6, 8 |
| 0014 | data-model, interface, module-boundaries | 2, 7 |
| 0015 | data-model, interface, state-machine | 3, 7 |
| 0016 | interface, module-boundaries, data-model | 4, 5, 7 |
| 0017 | data-model, interface, module-boundaries | 1, 7 |

## Feedback layer (M1.75)

The feedback layer is implemented and traced through the rows above. The
behavior files are the executable contract for the current code; deferred M1.5
rows are retained so the accepted decisions remain visible without claiming
implementation.

| Area | Behavior contract | Precise contracts |
|---|---|---|
| ECS kernel, facts, director, surfaces/cues | `feedback-surfaces.feature` | module-boundaries, interface, state-machine |
| Co-op ownership and per-player input | `feedback-surfaces.feature` | interface, state-machine |
| Entity conversations | `entity-conversations.feature` | interface, data-model, state-machine |
| Capability descriptors, event coverage, reasons | `capability-coverage.feature` | interface, module-boundaries, data-model |
| Effects, tile visuals, reduced motion | `cosmetic-effects.feature` | interface, module-boundaries, state-machine, failure-semantics |

## Material and pattern layer (M1.8)

| Area | Behavior contract | Precise contracts |
|---|---|---|
| Material/pattern catalog, bindings, data-only JSON authoring | `material-patterns.feature` | data-model, interface |
| Tile material grid, autotiling, deterministic variants | `material-patterns.feature` | data-model, interface, module-boundaries |
| Atlas assets, regions, frame refs, placeholder atlases | `material-patterns.feature` | data-model, interface |
| World/object/background pattern projection | `material-patterns.feature` | interface, module-boundaries |
| UI material/pattern CSS parity and contrast | `material-patterns.feature` | interface, data-model |
| No collision/puzzle/save authority; old-room compatibility | `material-patterns.feature` | module-boundaries, data-model |

Deferred within the accepted target: `wang` transitions, pattern animation,
image/atlas-sourced UI patterns, final atlases, and editor tooling.

## Online co-op (M4, proposed)

This table indexes the proposed online domain. It is not part of the M1.75
acceptance evidence until M4 Phase 0.

| ADR | Primary contracts/docs | M4 phase |
|---|---|---|
| 0047 | architecture §7 amendment, concurrency-topology | 0, 2 |
| 0048 | module-boundaries (`net`, `worker`), failure-semantics | 1, 3 |
| 0049 | interface (`NetWorld`, `NetInput`, `NetAction`), data-model (snapshot fields) | 2, 3 |
| 0050 | interface (surface actions, ownership), data-model (P1/P2 attribution) | 3, 4 |
| 0051 | save contract (host-only), curriculum evidence | 5 |
| 0052 | M1.75/M1.8/M2/M3 compatibility, module-boundaries | 0, 4, 6 |
| 0053 | failure-semantics, concurrency-topology | 1, 6 |
| 0054 | module-boundaries (`worker`), failure-semantics | 5, 6 |
| 0055 | deployment docs, CI workflows | 6 |
| 0056 | test matrix, acceptance evidence | 6 |
| 0057 | module-boundaries (`worker`), deployment/IaC docs, ADR-0055 | 0, 1, 6 |
