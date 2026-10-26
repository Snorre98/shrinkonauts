# ADR-0045: Recoverable save version mismatch

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** Snorre
- **Related:** ADR-0005, ADR-0012, ADR-0015, ADR-0041

## Context

ADR-0041 requires a `contentVersion` change to reset to the level checkpoint
while keeping progression and learning evidence. It also requires a pack version
mismatch to reset to the checkpoint rather than start a new run. The M1.5 save
module stored and type-checked `contentVersion`, but never compared it.
`loadRun` also discarded the parsed run on a pack-version mismatch, so the
runtime could only call `newRun`, which clears the save and loses progression.

A structurally valid v2 save contains serialised body transforms and puzzle
state that may no longer match changed content. It cannot be restored as-is, but
its progression and evidence are still meaningful.

## Decision

### Load result

`loadRun(packId?, packVersion?, contentVersion?)` first checks the complete v2
shape. A shape-valid save from the same pack is then classified:

- matching pack, pack version, and content version: `{ ok: true, run }`;
- same pack with a pack-version or content-version mismatch:
  `{ ok: false, reason: "VERSION_MISMATCH", run }`;
- different pack id: `PACK_MISMATCH`;
- v1 schema: `VERSION_MISMATCH` without a run;
- malformed v2 or corrupt data: `INVALID_SAVE`.

### Runtime recovery

When `VERSION_MISMATCH` carries a run:

1. Restore progression and curriculum events from the run.
2. Restore the active party composition.
3. Rebuild the saved level at the saved checkpoint; fall back to the room's
   first checkpoint if the saved id no longer exists.
4. Reset world bodies, props, and puzzle state to fresh content.
5. Return to `playing`; do not restore a debrief or complete overlay.
6. Show `Content updated — resumed from checkpoint` and autosave the rebuilt
   state with the current versions.

Pack-id mismatch, v1, and corrupt saves keep the existing new-run behaviour.

### Content version source

For M1.5, `contentVersion` mirrors the pack document's `version`. There is no
independent content hash yet. A future content hash can use the same load path
without another save schema change.

## Consequences

**Easier:**

- Version drift preserves what the player learned.
- The runtime has one recoverable mismatch path instead of treating every
  version change as a new run.
- The save module remains the only place that parses persisted JSON.

**Harder:**

- The load result is a three-way union; callers must check for a run.
- A content change can re-lock a puzzle exit even though old evidence remains.
  That is intentional: evidence describes the session, fresh puzzle state
  describes the current content.

**Constrained:**

- No serialised Matter world restore across versions.
- No v1 migration beyond reset.
- No new save schema version for this change.
- No separate content hash in M1.5.

## Alternatives considered

- **Restore the old world as-is** — may place bodies inside new geometry and
  cannot trust old puzzle state. Rejected.
- **Start a new run on any version change** — loses progression and evidence,
  contrary to ADR-0041. Rejected.
- **Keep only progression and reset the level entirely** — loses the checkpoint
  the player reached. Rejected.
- **Store a content hash now** — adds a field and authoring step not needed for
  the M1.5 close-out. Deferred.

## References

- [`../shrinkonauts/base-game/adr/0005-fixed-timestep-serializable-state.md`](../shrinkonauts/base-game/adr/0005-fixed-timestep-serializable-state.md)
- [`../shrinkonauts/base-game/adr/0015-no-fail-state-checkpoint-retry.md`](../shrinkonauts/base-game/adr/0015-no-fail-state-checkpoint-retry.md)
- [`0041-save-schema-v2.md`](0041-save-schema-v2.md)
