# Neuron Keeper (animated NPC)

The Neuron Keeper uses the same downscale + palette-quantise character pipeline
as P1/P2. The source is a 36-frame Ludo sheet:

```text
sprite-max-px-frames-36-rows-6-cols-6/
  sprite-max-px-frames-36-rows-6-cols-6.png   1602×1584 (6×6 frames of 267×264)
  sprite-max-px-frames-36-rows-6-cols-6.json  frame atlas, 80 ms per frame (12.5 fps)
```

The sheet has hard alpha and a transparent background, so it does not need
magenta keying.

## Build

```bash
npm run art:build-player -- \
  --character neuron-agent \
  --sampler downscale \
  --write-runtime
```

The build reads `working/clips.json`, which defines:

- `idle` — frame 0, static, output `agent-neuron.png`
- `idle-loop` — frames 0–35, 12.5 fps, looping, output `agent-neuron-idle.png`

It also writes the 8× preview and GIF under
`art-source/previews/poc/downscale/` and a report under `working/tmp/`.

## Runtime

- `sprite.agent.neuron` is the static frame-0 fallback.
- `sprite.agent.neuron.idle` is the 36-frame sheet.
- `03-nerve-forest` and `04-muscle-effector` set
  `idleAnimation: "sprite.agent.neuron.idle"` on their agent entity.
- `src/world/entity-idle-animator.ts` plays the sheet and keeps the static frame
  when reduced motion is on.
- This is a POC entity idle; the generalized ADR-0062 entity animation system
  remains deferred.

## Status

**POC integrated / final art approval pending.** The static and idle sheet are
runtime art. The nanobanan agent plate is an alternate review asset, not the
runtime source. The 04 Muscle Effector agent continues to reuse
`sprite.agent.neuron`; no 04-specific agent ID was added.
