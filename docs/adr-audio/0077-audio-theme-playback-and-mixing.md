# ADR-0077: Audio theme playback, crossfade, and mixing

- **Status:** Proposed
- **Date:** 2026-11-03
- **Deciders:** Snorre
- **Related:** ADR-0020, ADR-0029, ADR-0032, ADR-0076, ADR-0078
- **Extends:** ADR-0032 (audio cue abstraction)
- **Depends on:** ADR-0076 (per-room and menu themes)

## Context

`AudioModule` currently plays one-shot cues only:

```ts
export interface AudioModule {
  unlock(): Promise<boolean>;
  play(cueId: AssetId): void;
  setMuted(muted: boolean): void;
  toggleMuted(): boolean;
  setVolume(volume: number): void;
  readonly volume: number;
  readonly muted: boolean;
  readonly unlocked: boolean;
  dispose(): void;
}
```

`ManifestAudioProvider` is still a stub. It warns `AUDIO_FILE_PROVIDER_STUB` and falls back to the synth; no file-based cue or theme can play until it is implemented.

A room theme needs behaviour that the cue API does not provide:

- fetch and decode a long OGG/MP3 once, then play it;
- loop it without a gap;
- fade in/out and crossfade between room themes;
- start only after the browser's first user gesture;
- pause/resume without restarting the loop;
- mix music under SFX cues;
- survive a missing or failed theme without crashing.

The hub and pack currently use separate `AudioModule` instances. A true cross-context crossfade is not possible without a larger audio-mixer refactor. The v1 decision therefore uses a fade-out/fade-in across the hub → pack boundary, and a real crossfade within a pack.

## Decision

### 1. Extend the audio API

Add theme methods to `AudioModule` and the `AudioPort` seam:

```ts
interface AudioThemeOptions {
  loop?: boolean;      // default true
  fadeInMs?: number;   // default 800
  gain?: number;       // optional per-theme trim; default music bus gain
}

interface AudioModule {
  // existing methods...
  playTheme(assetId: AssetId, options?: AudioThemeOptions): void;
  stopTheme(options?: { fadeOutMs?: number }): void;
  pauseTheme(): void;
  resumeTheme(): void;
}
```

`AudioPort` gets the same four methods, with `AssetId` typed as `string` at the runtime seam.

### 2. Music bus and gain

- Add a dedicated `musicGain` node between the theme source and the destination.
- Default music gain: **0.35** of master (tune in the mix; range 0.30–0.35).
- Master `volume` and `muted` apply to the music bus.
- No separate music-volume setting in v1. A music slider is a later save/UI change.
- Cue playback keeps its current per-cue gain path; music and cues share the master volume only.

### 3. Loading, decoding, and caching

- `playTheme` resolves the asset through `AssetsModule` and fetches `asset.src`.
- Decode with `context.decodeAudioData`; cache the decoded `AudioBuffer` by asset ID.
- Keep at most two decoded buffers: the active theme and the most recently used other theme. Evict the rest.
- If the theme is already cached, start immediately.
- If it is not cached, fetch/decode, then start; the caller does not need to await.
- Preload the menu theme when the hub mounts and the room theme when the pack loads.

### 4. Looping

- Use `AudioBufferSourceNode.loop = true` for themes. This is sample-accurate and has no gap.
- The file must be authored as a seamless loop; the runtime must not add a fade at the loop point.
- `loop: false` is available for tests or a one-shot menu sting, but normal themes use `loop: true`.

### 5. Crossfade and transitions

- **Within a pack:** fade the old theme out and the new theme in over **800–1500 ms** using gain ramps. The default is 1000 ms.
- **Hub → pack:** fade the menu theme out over ~600–800 ms before the room theme starts; the pack theme fades in. This is a fade-out/fade-in, not a shared-context crossfade.
- **Pack → hub:** fade the room theme out; fade the menu theme in on the hub.
- **Debrief:** keep the room theme playing at the same level or lower it by ~6 dB; the room theme continues until the hub return.
- **Level transition:** stop/fade the old room theme and start the new one. Do not carry a room theme into a differently themed room.

### 6. First-gesture unlock and queuing

- Browsers do not allow audio before a user gesture.
- If `playTheme` is called before `unlock()`, store it as the pending theme and start it when `unlock()` succeeds.
- The menu theme starts on the first pointer/key interaction in the hub.
- A direct-boot room theme starts on the first interaction after the room loads.
- If the context cannot unlock, the theme stays pending; no error is shown to the player.

### 7. Pause, mute, and lifecycle

- `pauseTheme()` ramps the music bus to 0 and keeps the source running; this preserves the loop position.
- `resumeTheme()` ramps the music bus back to its configured gain.
- `setMuted(true)` ramps the master/music output to 0; the source may keep running silently.
- `dispose()` stops the source, disconnects the music bus, and clears cached buffers.
- Do not create a new `AudioContext` per theme; reuse the module's context.

### 8. Failure semantics

- Missing asset, fetch failure, decode failure, or unsupported format:
  - warn once per asset ID;
  - play silence;
  - do not fall back to synth music;
  - do not crash the game.
- Implement the theme path as a dedicated loader (or a provider option) so it does not invoke the cue synth fallback.
- A missing theme is not a validation failure unless the final/capture mode explicitly requires one.
- A failed theme must not block the room, the menu, or the SFX cues.

### 9. Tests

Add unit tests with the existing fake AudioContext:

- `playTheme` creates a source with `loop = true` and connects it through the music gain.
- Crossfade schedules gain ramps for old and new sources.
- `playTheme` before `unlock()` queues the theme; `unlock()` starts it.
- `pauseTheme`/`resumeTheme` ramp the music gain without stopping the source.
- `setMuted(true)` silences music and cues; unmute restores the configured level.
- A missing/failed theme warns once and does not throw.
- `dispose()` stops the source and clears the cache.

The browser smoke should confirm that the menu theme starts after the first click and the room theme starts after pack load. Unit tests cannot judge the loop seam; that is a manual three-loop check.

### 10. Out of scope for v1

- Adaptive layers/stems driven by puzzle state.
- Streamed music or range requests.
- A separate music-volume slider or per-theme user gain.
- A shared audio mixer across the hub and pack modules.
- Crossfading the hub and pack contexts as one continuous bus.
- Ducking music automatically per cue; the fixed low bus is the v1 approach.

## Consequences

**Easier:**

- The menu and rooms can have a coherent soundtrack.
- Room transitions do not cut abruptly.
- The browser autoplay policy is handled in one place.
- Music and cues share mute/volume without a new settings schema.
- A missing theme degrades to silence, not a crash.

**Harder:**

- The audio module grows from a cue player into a small music player.
- Decoded stereo themes consume memory; the cache must be bounded.
- Loop seams and crossfade timing need manual QA.
- The hub/pack boundary cannot be a true crossfade without a larger refactor.
- The existing `ManifestAudioProvider` must be implemented before any theme can play.

**Constrained:**

- No streaming.
- No adaptive music in v1.
- No separate music slider in v1.
- No automatic ducking; the music bed stays low.
- No theme playback before a user gesture.

## Alternatives considered

- **`HTMLAudioElement` with `loop = true`** — simpler, but poor Web Audio mixing, no sample-accurate crossfade, and inconsistent loop gaps. Rejected.
- **One `<audio>` element per theme** — easy to prototype, but volume/mute/crossfade become DOM-side and duplicated. Rejected.
- **Hard cuts between themes** — simplest, but audible and cheap-feeling. Rejected.
- **Crossfade across the hub and pack contexts** — requires a shared mixer/context. Deferred; fade-out/fade-in is acceptable for the launch transition.
- **Adaptive stems in v1** — much larger content and runtime scope. Rejected for v1.
- **Separate music slider in v1** — touches save schema and settings UI. Deferred.
- **Synth music fallback** — would not match the theme and would hide missing files. Rejected; silence plus warning is better.

## References

- [`0076-room-and-menu-audio-themes.md`](0076-room-and-menu-audio-themes.md) — theme scope and content model.
- [`../audio/room-and-menu-themes-v01.md`](../audio/room-and-menu-themes-v01.md) — prompts, lengths, and acceptance.
- [`../../src/audio/audio.ts`](../../src/audio/audio.ts) — current module.
- [`../../src/audio/providers.ts`](../../src/audio/providers.ts) — `ManifestAudioProvider` stub.
- [`../../src/audio/types.ts`](../../src/audio/types.ts) — `AudioModule`/`AudioProvider` contracts.
- [`../../src/game/runtime.ts`](../../src/game/runtime.ts) — `AudioPort` and cue playback.
- [`../../src/game/boot.ts`](../../src/game/boot.ts) — hub/pack audio lifecycle and unlock.
- [`../../tests/audio.test.ts`](../../tests/audio.test.ts) — existing audio test harness.
