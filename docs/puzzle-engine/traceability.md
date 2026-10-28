# Traceability matrix

Rows are ADRs. Columns are arc42 sections, behavior contracts (Gherkin), precise
contracts, and quality scenarios. Every ADR maps to at least one arc42 section;
every §10.2 quality scenario maps to at least one behavior contract.
`contracts/module-boundaries.md` is the required base-model row; ADR-0001 maps
to it and to §2/§5.2/§8.

| ADR | arc42 section(s) | Behavior contract | Precise contract | Quality scenario |
|---|---|---|---|---|
| 0001 | §2, §5.2, §8 | — | module-boundaries | Q3, Q5 |
| 0002 | §4, §5.2, §6.1, §8, §10 | physical-gates | state-machine, interface | Q1 |
| 0003 | §5.2, §6.1, §8, §10 | gate-presentation | interface, data-model | Q1, Q5 |
| 0004 | §4, §5.2, §6.2, §8, §10 | prop-lifecycle | data-model, state-machine, interface, failure-semantics | Q2 |
| 0005 | §4, §5.2, §6.1, §8, §10 | causal-links | interface, failure-semantics | Q1 |
| 0006 | §4, §5.2, §6.3, §8, §10 | per-level-debrief | data-model, interface | Q3, Q5 |
| 0007 | §4, §5.2, §6.4, §8, §10 | map-travel | data-model, state-machine, failure-semantics, interface | Q2 |
| 0008 | §2, §5.2, §8, §10 | schema-compatibility | data-model, failure-semantics | Q3, Q4 |

## Behavior contract ↔ quality scenario coverage

| §10.2 scenario | Behavior contract |
|---|---|
| Q1 faithful causal gate behavior | `physical-gates.feature`, `causal-links.feature` |
| Q2 no-softlock recovery | `prop-lifecycle.feature`, `map-travel.feature` |
| Q3 data-only authorability | `schema-compatibility.feature`, `per-level-debrief.feature` |
| Q4 backward compatibility | `schema-compatibility.feature` |
| Q5 testability and observability | all behavior contracts |

## Behavior contract ↔ ADR coverage

| Behavior contract | ADRs |
|---|---|
| `physical-gates.feature` | 0002 |
| `gate-presentation.feature` | 0003 |
| `prop-lifecycle.feature` | 0004 |
| `causal-links.feature` | 0005 |
| `per-level-debrief.feature` | 0006 |
| `map-travel.feature` | 0007 |
| `schema-compatibility.feature` | 0008 |

## ADR → contract completeness

| ADR | Primary contract | Implementation plan phase |
|---|---|---|
| 0001 | module-boundaries | 1 |
| 0002 | state-machine, interface | 2, 3 |
| 0003 | interface, data-model | 3 |
| 0004 | data-model, state-machine, interface | 1, 2, 3 |
| 0005 | interface, failure-semantics | 1, 2, 4 |
| 0006 | data-model, interface | 1, 4 |
| 0007 | data-model, state-machine, failure-semantics | 1, 4 |
| 0008 | data-model, failure-semantics | 1, 5 |

## Feedback layer (M1.75)

The full arc42/behavior/contract expansion is completed in Phase 8. This table
indexes the accepted feedback decisions now.

| ADR | Primary contracts | Implementation plan phase |
|---|---|---|
| 0009 | module-boundaries (`ecs`, `feedback`), interface (`FeedbackFrame`, `WorldEffectPlan`) | 2, 3, 4 |
| 0010 | interface (`FeedbackSurface`, anchors, input routing), data-model (ownership/attribution) | 4, 5 |
| 0011 | data-model (conversations save field), state-machine (dialogue mode removed) | 5 |
| 0012 | interface (descriptor tables, capabilities, rejection reasons), data-model (feedback overrides) | 3, 8 |
| 0013 | interface (`EffectPlan`, effect ports), failure-semantics (cosmetic/non-blocking effects), module-boundaries | 6, 8 |
