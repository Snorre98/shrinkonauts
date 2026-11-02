# ADR-0074: Hero-scale NPCs and interactables

- **Status:** Proposed
- **Date:** 2026-11-02
- **Deciders:** Snorre
- **Related:** ADR-0047, ADR-0048, ADR-0049, ADR-0070, ADR-0072,
  ADR-0073, ADR-0075
- **Supersedes:** the `world-2x entity` row and the agent/prop target rows in
  ADR-0072. The player `14×22` / `28×44` anchor, the `18×18` / `36×36` decor
  class, the `32×32` atlas frames, the `36×36` 1:1 scan class, and ADR-0072's
  encoding and status rules remain.
- **Extends:** ADR-0070 (pack/room presentation) and ADR-0072 (per-asset
  display sizes and fidelity classes).

## Context

The current M3 art is lossless, but it is size-starved. The Neuron Keeper is
authored from a 267×264 frame sheet and fitted to an 18×18 cell, a 14.8:1
downscale per axis. Even ADR-0072's proposed 24×24 entity cell is an 11.1:1
downscale and only a 48×48 display, which is 1.09× the 44 px player height. The
Keeper therefore reads as a small blob next to the astronauts instead of a
large world character.

The same problem applies to interactive objects. Gates, terminals, consoles,
sockets, and carryables share the 18×18 / 36×36 footprint. At the ADR-0070
stage of 1280×504 and camera zoom 2 they render at 72×72, or 14.3% of stage
height. They do not stand out from the background or from decorative scenery,
and their silhouettes cannot carry enough detail to say what they represent.

The intended composition is the opposite: the astronauts should look small and
simple inside a large, detailed world, and the objects the player can act on
should be the most legible things on screen. A global size bump would repeat
the one-size-fits-all mistake and make every pebble a monument. What is needed
is a small, explicit role hierarchy with per-entity overrides.

ADR-0048 requires a 2× authoring/display grid for the whole kit. ADR-0072
already records 1:1 exceptions for scan plates and the badge. The hero roles in
this record add a third deliberate density: the player and backdrop stay
chunky 2×; NPCs, interactables, and props become 1:1 so they carry more detail
than the astronauts.

## Decision

### 1. Role table

Display sizes are expressed at camera zoom 1. The camera's integer zoom then
scales the whole world uniformly.

| Role | Source cell | Display | Fidelity | Use |
|---|---:|---:|---|---|
| `player` | 14×22 | 28×44 | `world-2x` | P1/P2, player sheets |
| `npc` | 96×96 | 96×96 | `hero-1x` | Neuron Keeper, CPU Core, future agents |
| `interactable` | 64×64 | 64×64 | `hero-1x` | gates, puzzle gates, receptors, pulse sources, sockets, consoles, exits, world pads |
| `prop` | 48×48 | 48×48 | `hero-1x` | tracer, route plug, carryables |
| `scan` | 36×36 | 36×36 | `ui-1x` | floating scan plates and diagrams |
| `decor` | 18×18 | 36×36 | `world-2x` | scenery, unchanged |

At the 1280×504 stage and camera zoom 2:

| Role | Screen size | Share of stage height | Height vs player |
|---|---:|---:|---:|
| `player` | 56×88 | 17.5% | 1.00× |
| `npc` | 192×192 | 38.1% | 2.18× |
| `interactable` | 128×128 | 25.4% | 1.45× |
| `prop` | 96×96 | 19.0% | 1.09× |
| `scan` | 72×72 | 14.3% | 0.82× |
| `decor` | 72×72 | 14.3% | 0.82× |

The NPC is the only role that clearly towers over the astronauts. Interactables
are larger than the player, props are slightly taller, and scan/decor stay
subordinate. That is the intended hierarchy.

### 2. `hero-1x` is a recorded exception

`hero-1x` means source size equals display size: no upscale and no fractional
scale. The renderer uses nearest-neighbour sampling and the camera remains on
integer zoom.

- At zoom 1, one hero source pixel is one screen pixel; the player's one source
  pixel is a 2×2 block.
- At zoom 2, one hero source pixel is a 2×2 screen block; the player's one
  source pixel is a 4×4 block.

The density contrast is intentional and limited to the named hero roles. It is
not a licence to mix densities inside one asset, and it does not change the
player, decor, atlas, or background rules.

### 3. Configuration

Pack-level defaults live in `pack.json`:

```json
"presentation": {
  "roles": {
    "npc":          { "display": [96, 96], "fidelity": "hero-1x" },
    "interactable": { "display": [64, 64], "fidelity": "hero-1x" },
    "prop":         { "display": [48, 48], "fidelity": "hero-1x" },
    "scan":         { "display": [36, 36], "fidelity": "ui-1x" },
    "decor":        { "display": [36, 36], "fidelity": "world-2x" },
    "player":       { "display": [28, 44], "fidelity": "world-2x" }
  }
}
```

A room entity chooses a role:

```json
{
  "id": "agent-neuron",
  "type": "agent",
  "x": 1,
  "y": 20,
  "sprite": "sprite.agent.neuron",
  "idleAnimation": "sprite.agent.neuron.idle",
  "presentation": { "role": "npc" }
}
```

An entity may override the display size for a specific room:

```json
"presentation": { "role": "interactable", "display": [80, 80] }
```

The asset manifest carries the native display size and fidelity:

```json
"sprite.agent.neuron": {
  "type": "sprite",
  "src": "shared/sprites/agent-neuron.png",
  "display": { "width": 96, "height": 96 },
  "fidelity": "hero-1x"
}
```

**Resolution order:**

1. entity `presentation.display`
2. entity `presentation.role` → pack role display
3. asset manifest `display`
4. `36×36` fallback (current behaviour)

A role/manifest mismatch is a validation warning. It is not silently scaled,
because silently scaling a hero asset would either blur it or break the pixel
grid.

### 4. Default role inference

A pack may override the mapping with `presentation.defaultRoles`. Without an
override:

| Entity type | Default role |
|---|---|
| `agent` | `npc` |
| `prop` | `prop` |
| `gate`, `puzzleGate`, `receptor`, `pulseSource` | `interactable` |
| `scanTarget` | `scan` |
| `decor` | `decor` |
| `body`, `checkpoint`, `trigger`, `hazard`, `movingPlatform` | none |

The type default is only a starting point. World scan pads, sockets, consoles,
and exits are cast explicitly:

```json
"presentation": { "role": "interactable" }
```

This keeps the floating scan diagram at `36×36` while the physical pad it
labels can be `64×64`.

### 5. Rendering and interaction rules

- Display size is visual only. Physics bodies, collision shapes, puzzle rects,
  tether length, and level geometry do not change.
- The sprite, idle animator, world view, UI anchors, and effect anchors resolve
  the same display size.
- The interaction point remains the entity cell centre at the feet; interaction
  ranges do not grow with the sprite. A 96×96 NPC still uses the normal 70 px
  interaction range.
- The interaction glow width follows the display width and is capped; its
  height stays 8–12 px so it does not become a platform.
- Depth remains feet-based. `presentation.depthBias` is an optional tie-breaker
  when a hero sprite and the player share a foot line.
- Explicit `components.anchors` are local display pixels. Every enlarged asset
  must re-author its anchors, or the anchor must be marked normalised in a
  later schema. Anchors outside the display bounds fail validation.
- Missing role configuration preserves the current `36×36` behaviour. Existing
  rooms keep booting without migration.

### 6. Adopted mapping

| Asset | Current | Target |
|---|---|---|
| `sprite.agent.neuron` static + idle | 18×18 / 36×36 | 96×96 / 96×96, `npc` |
| `sprite.agent.cpu` | 18×18 / 36×36 | 96×96 / 96×96, `npc` |
| `sprite.gate.ferry`, `sprite.gate.actuator` | 18×18 / 36×36 | 64×64 / 64×64, `interactable` |
| `sprite.pulse.terminal`, `sprite.console.*`, `sprite.socket.*`, `sprite.exit*` | 18×18 / 36×36 | 64×64 / 64×64, `interactable` |
| `sprite.prop.tracer`, `sprite.prop.route_plug` | 18×18 / 36×36 | 48×48 / 48×48, `prop` |
| `sprite.receptor.*` | 18×18 / 36×36 | 64×64 / 64×64, `interactable` |
| `sprite.scan.*` | 16×16 / 36×36 | 36×36 / 36×36, `scan` |
| World pads (`pad-input-*`, `pad-terminal`, `pad-sensor`) | reused scan/decor art | new 64×64 `interactable` assets |
| Player | 14×22 / 28×44 | unchanged |
| Decor | 18×18 / 36×36 | unchanged |

`03-nerve-forest` moves `agent-neuron` to `x=30` on the axon terminal span. At
96 px it would overlap the P2 spawn, the dendrite pads, or the threshold gate
anywhere in the opening cluster; `x=1` sits under the current progress panel,
and `x=22` overhangs the floor gap at x=18–21. The x=30 span (928–1024 px) is
clear of `scan-pathway` at x=25 and `pad-terminal` at x=34, and the Keeper
remains interactable from the floor. The player meets it after running the
axon, where its one-way/terminal explanation is still relevant.
`04-muscle-effector` keeps `agent-muscle` at x=6 and reviews the terminal
spacing. `01-interrupt-loop` casts `agent-cpu` as `npc`, its
consoles/sockets/pad as `interactable`, and its floating scan plates as
`scan`.

## Consequences

**Easier:**

- The Keeper and CPU Core gain a silhouette that reads as a large character.
- Gates, terminals, sockets, and carryables become the most legible objects in
  the room.
- The player remains unchanged, so the astronaut scale reference is stable.
- Per-role defaults and per-entity overrides cover both the common case and the
  tight room.
- Packs and rooms without roles keep their current behaviour.

**Harder:**

- Hero assets need new 1:1 art, new idle sheets, and hand cleaning.
- The renderer, idle animator, world view, anchors, and validation must resolve
  sizes per entity rather than using `ENTITY_DISPLAY_SIZE`.
- Anchors, interaction prompts, depth ties, and carry/place offsets need
  review for every enlarged object.
- Contact sheets and capture reviews must include the player silhouette so the
  hierarchy is judged, not just the asset.
- The new density is a deliberate exception to ADR-0048 and must not leak into
  unrelated assets.

**Constrained:**

- No fractional display scale and no smooth filtering.
- No mixed densities inside one asset.
- No physics, collision, puzzle, tether, or level-geometry changes.
- No role that makes decorative scenery compete with interactables.
- No silent role/manifest display mismatch.
- No lossy encoding.

## Validation

- At 1280×720, the 03 preset produces a 1280×504 stage and zoom 2.
- The NPC renders at 192×192 screen (38% of stage height); interactables at
  128×128 (25%); props at 96×96 (19%); the player stays at 56×88.
- The Neuron Keeper reads as one body, one nucleus, 5–7 tentacles, one tail,
  forked terminals, and a lantern at 1× display.
- A gate, terminal, socket, and route plug read as distinct objects at 64, 64,
  64, and 48 px.
- The player is unchanged at 14×22 / 28×44; the atlas frames remain 32×32.
- A room without roles still boots at the current 36×36 size.
- Every enlarged asset's anchors lie inside its display bounds.
- `npm test`, `npm run pack:validate`, and the 1280×720 capture review pass.

## Alternatives considered

- **Keep ADR-0072's 48×48 entity** — rejected: 1.09× player height is not a
  hierarchy, and 24×24 source still crushes the Keeper.
- **Make every entity 96×96** — rejected: simple props and scenery would become
  oversized and compete with the player.
- **Scale the existing 18×18 art up at runtime** — rejected: it enlarges the
  blobs without adding detail.
- **Apply 2× to hero assets as well** — rejected as the primary treatment: it
  keeps the pixel grid uniform but gives the NPC/objects the same density as
  the astronauts. It remains the fallback if 1:1 reads too smooth in review.
- **Enlarge the camera or the whole world** — rejected: it changes gameplay
  framing and does not distinguish objects from scenery.
- **One global display constant** — rejected: it repeats the current
  one-size-fits-all mistake.

## References

- [`03-nerve-forest/room.json`](../../public/packs/anatomy-reflex/levels/03-nerve-forest/room.json)
- [`04-muscle-effector/room.json`](../../public/packs/anatomy-reflex/levels/04-muscle-effector/room.json)
- [`01-interrupt-loop/room.json`](../../public/packs/silicon-reflex/levels/01-interrupt-loop/room.json)
- [`src/pack/types.ts`](../../src/pack/types.ts)
- [`src/pack/parse-presentation.ts`](../../src/pack/parse-presentation.ts)
- [`src/world/entity-style.ts`](../../src/world/entity-style.ts)
- [`src/world/room-scene.ts`](../../src/world/room-scene.ts)
- [`src/world/entity-idle-animator.ts`](../../src/world/entity-idle-animator.ts)
- [`src/game/runtime.ts`](../../src/game/runtime.ts)
- [`src/ui/anchors.ts`](../../src/ui/anchors.ts)
- [ADR-0047](../adr-m3/0047-pixel-art-visual-direction.md)
- [ADR-0048](../adr-m3/0048-half-resolution-pixel-rendering.md)
- [ADR-0049](../adr-m3/0049-pixel-ui-chrome-and-typography.md)
- [ADR-0070](0070-stage-bands-and-play-band-camera.md)
- [ADR-0072](0072-asset-fidelity-tiers-and-encoding.md)
- [ADR-0075](../adr-art-pipeline/adr-0075-hero-asset-treatment.md)
