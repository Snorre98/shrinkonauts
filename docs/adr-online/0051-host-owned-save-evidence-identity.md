# ADR-0051: Host-owned save, evidence, and ephemeral identity

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Snorre
- **Related:** ADR-0039, ADR-0041, ADR-0045, ADR-0047, ADR-0050, ADR-0054

## Context

The current game is a local learning game. `shrinkonauts.run` is the durable
run; `shrinkonauts.settings` is local settings; evidence is exported as JSON
from the local curriculum. There is no account or server-side transcript.

Online co-op introduces two clients that can observe and influence the same
run. The learning evidence must remain trustworthy enough for a demo and must
not be duplicated or forged by the guest. At the same time, M4 is not an
assessment platform and must not pretend to be one.

## Decision

### 1. The host owns the run

- The host creates, mutates, autosaves, and exports the run.
- The host’s `RunSnapshot` is the only authoritative save.
- The guest never writes `shrinkonauts.run`.
- The guest uses a memory/no-op save port for the session.
- Guest settings (audio, text scale, reduced motion) remain local to the guest
  and are never overwritten by host snapshots.

### 2. Guest actions are host-recorded

- Guest input applied by the host is attributed to P2.
- `recordEvent` runs once, on the host.
- The host export includes P1 and P2 evidence.
- The guest cannot export the host run.
- If the guest disconnects, already-recorded events remain on the host.

### 3. Identity is ephemeral

- A session is identified by a room code and a host-generated session ID.
- There are no accounts, profiles, display names, or persistent player IDs.
- The guest is shown as “P2” (or a local label) for the session.
- The room code is not identity; it is a bearer token for joining.
- No PII is required or stored by the Worker/DO.

### 4. Save and restore semantics

- Host autosave points remain the existing ones: level start, checkpoint
  changes, gate solves, debrief updates.
- A host reload mid-session ends the online session; the host can resume the
  local run from its save. The guest cannot resume it.
- Guest reconnect within the grace window re-syncs from the host’s current run
  snapshot; it does not load a guest save.
- A version mismatch follows the existing ADR-0045 recovery path on the host,
  not on the guest.

### 5. Evidence trust boundary

- M4 evidence is suitable for a co-op demo, playtest observation, and design
  research with consent.
- It is **not** trusted assessment evidence if the guest is untrusted: the guest
  can send arbitrary input, and there is no authentication or anti-cheat.
- The host-only export and P2 attribution are integrity conveniences, not a
  security guarantee.
- Any future graded or public deployment needs authentication, server-side
  validation, and a separate ADR.

### 6. What the guest may know

The guest receives:

- the host `RuntimeSnapshot` (world, puzzle, gate/debrief views, feedback);
- the initial `RunSnapshot` needed to render the current level;
- no host filesystem paths, no save keys, no other local data;
- no evidence export endpoint or host save blob beyond what is needed to render.

## Consequences

**Easier:**

- One save writer; no merge/conflict problem.
- P2 evidence is recorded in the same curriculum timeline as P1.
- Guest settings remain private and local.
- No account or database work.

**Harder:**

- Host refresh ends the online session.
- Guest evidence cannot be recovered if the host leaves.
- Public evidence cannot be treated as trustworthy.
- The guest UI must not expose export/new-run controls.

**Constrained:**

- No guest save, guest export, or guest-owned progression.
- No cross-device resume.
- No identity, friends, or persistent rooms.
- No server-side transcript.

## Alternatives considered

- **Both clients save and merge.** Rejected: conflict resolution and duplicate
  evidence are disproportionate.
- **Guest saves a local copy for later.** Rejected: it would diverge from host
  authority and invite forged evidence.
- **Server-side evidence store.** Rejected for M4: adds accounts, privacy,
  storage, and trust scope.
- **Host and guest both export.** Rejected: duplicate/contradictory transcripts.
- **Anonymous per-player IDs in the URL.** Deferred; not needed for a private
  two-player demo.

## Tests

- Guest save port is a no-op; host save remains the only `shrinkonauts.run`.
- P2 actions produce exactly one learning event on the host.
- Host export contains P1 and P2 events.
- Guest cannot call export/new-run/clear-run through UI or protocol.
- Guest settings survive host snapshots.
- Host reload ends session; local resume works.
- Version mismatch follows ADR-0045 on host.

## References

- `src/save/index.ts` — `RUN_STORAGE_KEY`, `RunSnapshot`, `SaveModule`
- `src/curriculum/` — evidence and export
- `docs/adr-m1.5/0039-puzzle-as-assessment-source.md`
- `docs/adr-m1.5/0041-save-schema-v2.md`
- `docs/adr-m1.5/0045-recoverable-save-version-mismatch.md`
- ADR-0047, ADR-0050, ADR-0054
