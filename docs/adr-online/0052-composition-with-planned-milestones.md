# ADR-0052: Composition with feedback, materials, multi-level content, and art

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Snorre
- **Related:** ADR-0009–0017, ADR-0034–0046, ADR-0047, ADR-0049, ADR-0050

## Context

M4 is scheduled after all direct code/game development milestones:

- **M1.75** — feedback ECS, anchored surfaces, per-player input, entity
  conversations, effects, tile visuals, content migration, validation,
  accessibility.
- **M1.8** — materials, tile material grid, autotiling, variants, pattern
  projection, atlas assets, UI material parity.
- **M2** — six room puzzles plus the Silicon fixture, multi-level progression,
  side travel, debrief, evidence.
- **M3** — final art/audio for `03-nerve-forest`, final manifest, capture build.

Some of these are not implemented yet. M4 must not bake in assumptions that
contradict them, and must not create a parallel path that bypasses them.

## Decision

### 1. M4 consumes the final layers; it does not reimplement them

- Feedback, effects, conversations, materials, patterns, atlases, puzzles, and
  content remain authoritative on the host.
- The guest renders host output; it does not instantiate a second
  `FeedbackDirector`, `PuzzleRuntime`, or dialogue session.
- No online-specific feedback text, asset ID, material, puzzle type, or save
  field is added.

### 2. M1.75 feedback and effects

- Host `FeedbackDirector` produces surfaces, beats, and effects.
- Host `RuntimeSnapshot.feedback` is replicated at UI snapshot cadence.
- Guest renders surfaces in the existing world-space/HUD/modal layers.
- Surface `owner`/`actor`/`accent` are preserved; P2 sees its own attribution.
- Effects are cosmetic and host-owned. The guest may render effect plans but
  never applies them to collision or puzzle state.
- Tile visual operations remain host-computed; the guest mirrors the resulting
  visual state.
- Reduced motion remains a local guest setting; the guest simplifies/removes
  effects locally without changing host state.

### 3. M1.75 entity conversations

- Host owns `ConversationState` and the narrative session.
- Guest receives speech-bubble surfaces and can act only on P2-owned surfaces.
- Both players may hold simultaneous conversations, as in local co-op.
- The host validates `advance`/`choose`/`cancel` against the current node and
  owner.
- Conditional dialogue, effects, and node skipping use host state; the guest
  never evaluates the dialogue graph.
- The retired global dialogue overlay is not reintroduced for online.

### 4. M1.8 materials, patterns, and atlases

- Both clients load the same pack, materials, patterns, atlases, and theme from
  the static build.
- **No texture, atlas, material, pattern, or variant data is streamed.** The
  protocol carries IDs and state only.
- Host runs autotiling and variant selection; the guest renders the same room
  content locally. Variant determinism is already content/seed based.
- Tile visual effects from M1.75 layer on the material base; the guest mirrors
  host `TileVisualState` operations.
- Material bindings never affect collision; online authority does not change
  that.
- UI material/pattern parity is local; host snapshots do not overwrite guest
  CSS/theme settings.
- The M3 asset inventory is re-baselined after M1.8, so M4 uses the final
  material-aware manifest.

### 5. M2 multi-level content and puzzles

- M4.0 ships **one level**, `03-nerve-forest`, with the final M3 asset set.
- The online session is level-scoped: `levelId`, `roomId`, `checkpointId`, and
  `RunSnapshot` are host-authoritative.
- On a host level transition (`onLevelChange`), the host sends a new `run` or a
  `level` message; the guest rebuilds its scene with the same mechanism as the
  local renderer.
- M4.0 does not support guest-initiated map travel, side-level travel, or
  post-debrief transitions; the host drives them.
- The M2 pack is used in tests to ensure the protocol does not assume a single
  level. M4.1 extends online play to the full pack.
- The Silicon fixture is content/transfer, not a new online mode; if M4.1
  includes it, it uses the same host-authoritative session.
- No new puzzle types, gate types, verbs, abilities, or save fields are added by
  M4.

### 6. M3 final art, audio, and capture

- Both clients load the same final manifest; no per-client asset differences.
- Audio remains local. Cue IDs may be mirrored, but audio files are not streamed
  and playback is not synchronized.
- Static sprites remain static; online does not add animation.
- Deferred UI assets remain deferred; online does not create a new UI skin.
- Capture mode is local-only. M4.0 does not add networked capture, spectator
  views, or a second camera. A future host capture mode must not change the
  protocol’s authority model.
- The M3 `?assets=final` path must work for both host and guest.

### 7. Future planned features

| Feature | M4 boundary |
|---|---|
| Full key rebinding | Local per client; protocol carries actions, not keys. |
| Conditional dialogue skipping | Host narrative state; guest mirrors; no guest graph evaluation. |
| Music/ambience loops | Local playback; no synchronization. |
| Map travel and side levels | Host authority; guest mirrors; guest-initiated travel deferred. |
| Capture mode | Local only; no network capture in M4. |
| Mobile/touch | Out of scope; input protocol is agnostic but no touch UI. |
| Spectators | Out of scope; DO has two slots. |
| Full M2 pack online | M4.1; same authority, level/session lifecycle work. |
| Guest prediction | Deferred; separate ADR; must not change host authority. |
| Host migration | Out of scope; would require a new authority ADR. |
| Server authority | Out of scope; would be a different game-server architecture. |

### 8. Contract amendments

M4 must amend, not silently bypass:

- `architecture.md` §7 local-only deployment statement;
- `failure-semantics.md` §1 “not a networked service”;
- `concurrency-topology.md` §1 “no worker, background queue, or parallel
  writer.”

The amendment says: **local single-player and local co-op remain unchanged; the
optional online mode is host-authoritative, and the DO is a relay, not a game
simulation.** The existing contracts remain the default for all non-online
paths.

## Consequences

**Easier:**

- No duplicate feedback/dialogue/material implementations.
- M4 inherits M1.75/M1.8/M2/M3 fixes automatically.
- The guest can render the final art/materials without asset transfer.
- M4.1 can extend to the full pack without changing authority.

**Harder:**

- M4 cannot start before those layers are stable.
- Snapshot schema must include any new M1.75/M1.8/M2 view fields.
- Guest scene rebuild on level change must be tested against M2 content.
- Local-only contract language must be updated carefully so it does not weaken
  local guarantees.

**Constrained:**

- One level in M4.0.
- No new content or asset IDs.
- No guest-driven level travel or side travel.
- No networked capture/spectators.
- No parallel online feedback/dialogue path.

## Alternatives considered

- **Build online co-op before M1.75/M1.8/M2/M3.** Rejected: it would fork
  feedback, dialogue, materials, and multi-level logic, then need rework.
- **Add an online-specific feedback/dialogue layer.** Rejected: two sources of
  truth.
- **Stream textures/atlases to the guest.** Rejected: both clients already have
  the static build; streaming adds cost and desync.
- **Make the guest run materials/autotiling independently from host state.**
  Rejected: materials are deterministic content, but tile visual effects and
  variant state must follow the host snapshot.
- **Support the full M2 pack in M4.0.** Deferred; level/session lifecycle would
  dominate the milestone.

## Tests

- M1.75 surfaces/effects/conversations render on guest with P1/P2 attribution.
- M1.8 material/atlas room renders on both clients from the same build.
- M2 multi-level fixture: host transition updates guest `levelId`/`roomId` and
  rebuilds the guest scene.
- M3 final manifest loads on both; no asset IDs are missing.
- Guest cannot evaluate dialogue/feedback/material state independently.
- Local-only paths still pass the existing suites.

## References

- `docs/m1.75/README.md`
- `docs/puzzle-engine/feedback-implementation-plan.md`
- `docs/m1.8/README.md`
- `docs/puzzle-engine/material-pattern-implementation-plan.md`
- `docs/m2/nervous-puzzles/README.md`
- `docs/m3/asset-requirements.md`
- ADR-0009–0017, ADR-0034–0046
