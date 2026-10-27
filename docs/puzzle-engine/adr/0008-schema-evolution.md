# ADR-0008: Backward-compatible schema evolution

Status: Accepted

## Context

The upgrade adds puzzle fields (`initial`, `requires`, `message`), link types
(`unlock`, `clear`), prop states (`locked`, `cleared`), level fields
(`debrief`, `kind`), gate entity fields (`body`, `openSprite`,
`closedSprite`), and a save field (`returnTo`). Existing 03/04 content and
existing 2.0 saves must keep working during the migration.

A major-version rewrite would force every level, test, and save to migrate at
once; an unversioned optional-field free-for-all would make invalid content
hard to diagnose.

## Decision

Use minor schema versions and optional fields; keep the existing acceptance
rules.

| Format | Version | Compatibility |
|---|---|---|
| Puzzle document | `1.1` | Parser accepts `1.x`; 1.0 documents have no new fields and behave as before |
| Level document | `1.1` | Parser accepts `1.x`; no debrief override means syllabus fallback; no kind means main |
| Run snapshot | `2.1` | Loader accepts `2.x`; missing `returnTo` means no side excursion; old prop states remain valid |
| Pack content | manifest version bump when content is migrated | ADR-0045 version-mismatch recovery remains |

Rules:

- New fields are optional and default to the old behavior.
- New enum members are additive: `locked`/`cleared` prop states, `unlock`/
  `clear` link types, `propReleased`/`propCleared`/`linkBlocked` events.
- The validator rejects unknown new fields when present, illegal link types,
  unknown `requires` nodes, and invalid prompt/evidence references.
- The parser does not silently coerce an invalid new value to an old one; it
  returns a schema error.
- Old puzzle/level/save fixtures are kept in the test suite as compatibility
  cases.
- Content migration is explicit: a level opts into a physical gate by adding
  `components.body`, into visuals by adding sprite IDs, into a debrief override
  by adding `debrief`, and into the side map by adding `kind: "side"`.
- A pack version bump is required when the migrated content ships; save
  recovery follows ADR-0045.

## Consequences

**Easier:**

- Existing content and saves keep running while the engine lands.
- The upgrade can be phased: pure schema/runtime first, world sync next, content
  migration last.
- Compatibility tests are a concrete acceptance gate.

**Harder:**

- The parser and validator must handle both old and new shapes.
- Save snapshots need explicit defaults for new state.
- Content authors must know when a field is opt-in.

**Constrained:**

- No big-bang schema rewrite.
- No silent migration of semantically different states.
- No new save field other than `returnTo` in this upgrade.

## Alternatives considered

- **Major version bump for every format** — forces all content and saves to
  migrate together and delays feedback. Rejected.
- **No version bump** — hides breaking changes and makes old/new content
  indistinguishable. Rejected.
- **Separate new puzzle format** — duplicates parsers, validators, and runtime
  types. Rejected.
- **Infer new behavior from field presence without validation** — produces
  silent misconfigurations. Rejected.
