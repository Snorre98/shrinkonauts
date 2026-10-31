# ADR-0059: Pack catalog and per-pack save slots

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Snorre
- **Related:** ADR-0041, ADR-0045, ADR-0058

## Context

The M1 boot path hardcodes `anatomy-reflex`, and `shrinkonauts.run` is one
global run slot. The bathroom hub lets the player choose between
`anatomy-reflex` and the planned `silicon-reflex` pack. Switching packs must not
overwrite progress, and a pack that is visible before its content exists must
not be startable.

## Decision

### 1. `public/packs/index.json` is the catalog

The catalog is an ordered list of cycles:

```json
{
  "schemaVersion": "1.0",
  "packs": [
    {
      "id": "anatomy-reflex",
      "path": "anatomy-reflex/",
      "status": "available",
      "online": true,
      "order": 10,
      "title": "Anatomy: The Reflex Arc",
      "subtitle": "Nervous system"
    },
    {
      "id": "silicon-reflex",
      "path": "silicon-reflex/",
      "status": "coming-soon",
      "online": false,
      "order": 20,
      "title": "Silicon: Interrupt Loop",
      "subtitle": "Hardware transfer"
    }
  ]
}
```

- `status` is `available`, `coming-soon`, or `unavailable`.
- `online` is the M4.0 online-availability flag.
- `path` is a safe relative directory under `public/packs/`.
- The catalog is parsed by `src/pack/catalog.ts`; duplicate IDs, unsafe paths,
  invalid statuses, and malformed entries are rejected.
- `pack:validate` checks available entries against their `pack.json` and reports
  coming-soon entries as expected warnings.

M2 implements `silicon-reflex` and changes its status to `available`. The hub
needs no code change for that transition.

### 2. Run slots are per pack

- Run saves live at `shrinkonauts.run.<packId>`.
- `shrinkonauts.run` remains a migration source. On the first load for a pack,
  a legacy save is copied into that pack's slot, then the legacy key is removed.
- A legacy save for another pack is reported as a pack mismatch and is not
  copied into the wrong slot.
- Settings remain global in `shrinkonauts.settings`.
- The hub reads `save.hasRun(packId)` to show "Continue" and "New cycle".

### 3. Start options are explicit

`GameRuntime.start({ resume?, activeP2? })`:

- `resume: false` starts a fresh run and clears that pack's slot.
- `activeP2: false` starts Solo; `true` starts Local co-op.
- When resuming, the override still wins, so the hub's mode selection is
  authoritative.

### 4. Silicon is a separate pack

The catalog reserves `silicon-reflex` as a separate pack, consistent with M2's
recommendation. The optional `startLevelId` catalog field exists only as a
future escape hatch for an in-pack fixture; the shipped catalog does not use it.

## Consequences

**Easier:**

- Switching cycles preserves each pack's progress.
- M2 can turn Silicon on by editing content and one catalog status.
- M4 can use the same catalog and per-pack identity in its handshake.
- The hub has a single, data-driven list of cycles.

**Harder:**

- Save migration must be covered by tests.
- The catalog duplicates display metadata that must stay in sync with
  `pack.json`; validation checks available entries.
- A guest in M4 must not treat its local slot as the session save.

**Constrained:**

- One run per pack, not multiple profiles.
- No catalog editing UI.
- No remote pack download; packs are part of the static build.

## Alternatives considered

- **Keep one global run slot.** Rejected: switching packs would overwrite
  progress.
- **Store a map of runs under one key.** Rejected: more migration and corruption
  surface than one key per pack.
- **Hardcode the two pack cards in the UI.** Rejected: M2 status changes and
  future packs would require code edits.
- **Load every pack at boot.** Rejected: the hub only needs the catalog and its
  own assets; pack content loads on Start.
- **Make Silicon a level inside `anatomy-reflex`.** Kept as a future fallback,
  but not the default; the separate pack is the cleaner pack-boundary proof.

## Tests

- Catalog parse, ordering, duplicate IDs, unsafe paths, invalid status.
- Available pack metadata matches `pack.json`.
- Per-pack saves are isolated.
- Legacy single-slot save migrates into the matching pack.
- Legacy save for another pack returns `PACK_MISMATCH`.
- `clearRun(packId)` removes only that slot.
- Solo start sets `activeP2=false`; local co-op sets it true.
- Hub renders coming-soon packs as disabled.

## References

- `src/pack/catalog.ts`
- `public/packs/index.json`
- `src/save/index.ts`
- `src/game/runtime.ts`
- `tests/catalog.test.ts`
- `tests/save.test.ts`
- ADR-0041, ADR-0045, ADR-0058
