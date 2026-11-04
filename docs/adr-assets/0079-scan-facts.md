# ADR-0079: Scan targets reveal card facts, not shared concepts

- **Status:** Accepted
- **Date:** 2026-11-04
- **Deciders:** Snorre
- **Related:** ADR-0029, ADR-0033, ADR-0060, ADR-0072, ADR-0074, ADR-0075, ADR-0078
- **Supersedes:** the scan-target portion of ADR-0078 §5 and the optional
  `sprite.scan.myelin` decision

## Context

The 03 Nerve Forest scan targets were implemented as concept reveals. Each
`scanTarget` had a `conceptId`; `GameRuntime.scan()` blocked the action when that
concept was already known. That produced three problems:

1. The Keeper dialogue revealed CON-3, then told the player to scan the neuron,
   myelin, and pathway labels. The CON-3 scans were already blocked.
2. The room had six scan targets but only two concept cards. The pad inputs and
   `scan-neuron`/`scan-myelin` shared CON-3; `pad-terminal` and `scan-pathway`
   shared CON-5. In the intended talk-then-scan flow, five of six scans were
   no-ops.
3. `sprite.scan.neuron` and `sprite.scan.myelin` shared one icon and one card.
   The art was being asked to distinguish scans that the content system treated
   as duplicates. The old neuron/pathway plates also fit 32×17 and 32×13 at
   36×36; the new pathway image was effectively the neuron image plus a pulse.

The M2 level design already described **card facts** (NERV-01#1, #3, #5, #6),
and the anatomy fidelity ledger defines those facts independently of the
syllabus concepts. The runtime had no fact layer.

## Decision

1. **Scan targets reveal a `factId`.** The pack declares a `facts.json` with
   `id`, `cardId`, `conceptId`, `title`, `claim`, and optional `depth`.
   `GameRuntime.scan()` checks known facts, records `fact_revealed`, and reveals
   the parent concept if needed.
2. **The 03 scan set is three fact-specific targets:**
   - `scan-neuron` → NERV-01#1 (neuron parts and direction)
   - `scan-myelin` → NERV-01#3 (myelin sheath, nodes, speed)
   - `scan-pathway` → NERV-01#6 (all-or-none, one-way, saltatory)
3. **The Keeper dialogue reveals CON-3, CON-5, and NERV-01#5.** CON-5 is a
   dialogue preview in 03; it has no scan target. NERV-01#5 is the threshold
   fact.
4. **The pads and terminal are interactable props, not scans.** Their puzzle
   rects are independent of entity type. This removes the duplicate CON-3/CON-5
   scan targets without changing the puzzle.
5. **`sprite.scan.myelin` is a required dedicated asset.** The shared
   neuron/myelin icon is retired. The three new prompts are in
   [`docs/assets/scan-prompts-v02.md`](../assets/scan-prompts-v02.md).
6. **Scan art acceptance adds compactness and distinctness gates.** A fitted
   scan must reach at least 24×24 in the 36×36 cell (or trimmed aspect ≤ ~1.35),
   have at least 300 opaque pixels, and be pairwise distinct from the other scan
   icons at 36×36 (alpha IoU ≤ ~0.80). The three silhouettes are round cell,
   capsule sheath, and bead chain.

## Consequences

- The concept log groups facts under their parent concept; a scan panel shows
  the fact title and claim instead of the concept definition.
- A scan is blocked only when its own fact is known. Different facts under
  CON-3 remain scannable.
- `pack:validate` checks fact references, duplicate fact IDs, duplicate scan
  assignments, dialogue/scan redundancy, and unreachable facts.
- The old root JPEGs and the old whole-cell prompts are reference only. They are
  not sources for the new concepts.
- The 03 room’s scan count drops from six to three. The Keeper line “scan the
  neuron, myelin, and pathway labels” is now true.
- Future scans in 04/05 can use the same fact model without adding a concept per
  detail.
