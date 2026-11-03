# Action shots — reproducible gameplay captures

The public gallery includes a **Gameplay walkthrough** built from the live app,
not from hand-picked screenshots. The captures are stills at 1280×720 taken by
Playwright using the system Chrome installation.

- Published page: `gdd/walkthrough.html`
- Capture command: `npm run gdd:capture`
- Gallery merge: `npm run gdd:site`
- Gallery smoke: `npm run gdd:smoke`

The generated files are **not committed**:

```text
gdd-captures/                 ignored
  captures.json               capture metadata sidecar
  <slug>.png                  1280×720 viewport screenshots
```

`npm run gdd:site` copies the PNGs to `public/gdd/captures/`, writes a public
`captures.json`, and merges the sidecar into `public/gdd/manifest.json`.
`npm run build` then copies `public/gdd/` into `dist/gdd/`.

## State catalogue

The canonical list is `e2e/capture/states.ts`. The capture pass asserts that
every entry in that file was captured.

| Flow | IDs |
|---|---|
| Hub | `hub-default`, `hub-settings`, `hub-silicon-selected`, `hub-placeholder` |
| Launch | `launch-spin`, `launch-shrink` |
| 03 Nerve Forest | `03-coop-wide`, `key-art-03`, `03-dialogue-neuron`, `03-scan-feedback`, `03-concept-log`, `03-map`, `03-threshold-gate`, `03-node-run-input`, `03-node-run-threshold`, `03-node-run-exit-open`, `03-debrief-prompt`, `03-debrief-filled` |
| 04 Muscle Effector | `04-wide`, `key-art-04`, `04-ferry-active`, `04-ach-carry`, `04-nicotinic-receptor`, `04-pulse-muscle-wave`, `04-debrief-prompt`, `04-level-complete` |
| Silicon | `silicon-wide`, `key-art-silicon`, `silicon-cpu-dialogue`, `silicon-interrupt-puzzle`, `silicon-concept-gate` |
| Modes / accessibility | `03-solo`, `text-scale-125`, `reduced-motion` |

`03-coop-wide` is the local co-op reference in the Modes section, so the
walkthrough does not duplicate it as a separate file.

## Metadata

Every entry carries:

- `id` — stable slug and walkthrough anchor
- `title` — human label
- `flow` — hub / launch / 03 / 04 / silicon / modes
- `pack` — hub / anatomy / silicon
- `level`, `room` — content IDs where applicable
- `beat` — state name, e.g. `node-run-threshold`
- `mode` — solo / co-op / n/a
- `objectiveIds`, `conceptIds` — curriculum links
- `relatedAssets` — runtime manifest IDs
- `whatToNotice` — 1–2 sentence caption
- `art` — `final` or `placeholder`
- `order` — walkthrough order
- `alt` — accessible image description
- `docs` — rendered doc slugs
- `compareWith`, `compareLabel` — optional comparison pair

The capture sidecar adds `file`, `width`, `height` and `capturedAt`.
`scripts/gdd-site.ts` validates slugs, dimensions, doc slugs and related asset
IDs before merging.

## Capture mechanics

- Uses the existing Playwright `channel: "chrome"` and 1280×720 viewport.
- Boots with the existing `?skipMenu=1&pack=...` shortcut and drives the app
  with the same `teleport` / `waitForRoom` / overlay helpers as the smoke tests.
- Asserts app state before each screenshot: room id, HUD text, overlay role,
  feedback surface ID/state or runtime snapshot.
- Polls the HubScene for the drum angle (spin) and tiny astronaut (shrink)
  instead of sleeping for a guessed cinematic duration.
- Pauses the Phaser loop for the screenshot and uses
  `animations: "disabled"` so transient effects do not move between the
  assertion and the capture.
- HUD-free key-art shots hide only the presentation layers; the game state is
  unchanged.
- Fails on console errors or failed HTTP responses in each flow.

## CI

The `verify` job runs the capture before `gdd:site`:

```text
npm run gdd:capture
npm run gdd:site
npm run gdd:smoke
npm run build
```

A capture failure uploads `gdd-captures/`, `test-results/` and
`playwright-report/` as a failure artifact. The deploy workflow is unchanged:
it publishes the `dist` artifact, which already contains the merged gallery.

## Known gaps

- **03 concept gate:** `gate.json` defines `gate-nerve-01`, but
  `level.json` has `"gateIds": []`; no 03 room entity opens it. The walkthrough
  captures the 03 threshold gate as a world object and the Silicon
  `gate-transfer` overlay as the concept-gate example.
- **04 background:** the 2026-11-03 batch wires the final 1280×720
  `bg.muscle_endplate.sky`, four coloured material atlases, and the final
  `sprite.gate.nerve` / `sprite.exit`. Captures after this pass show the final
  04 art; far/mid/near remain declared placeholders.
- **03 scan placeholders:** `sprite.scan.neuron`, `sprite.scan.myelin`, and
  `sprite.scan.pathway` are separate colored placeholder boxes (yellow NEUR,
  cyan MYEL, cyan PATH). The shared neuron/myelin icon is retired. The new
  fact-specific prompts are in
  [`../assets/scan-prompts-v02.md`](../assets/scan-prompts-v02.md).
- Three pilot SFX (`scan`, `jump`, `land`) are installed; the other 15 cues and
  four themes remain placeholders.
- The key-art shots are stills with the UI hidden, not separately authored
  marketing art.
