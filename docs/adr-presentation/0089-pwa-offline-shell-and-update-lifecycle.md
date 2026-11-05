# ADR-0089: Installable PWA shell, offline runtime, and prompt-based updates

- **Status:** Proposed
- **Date:** 2026-11-05
- **Deciders:** Snorre
- **Related:** ADR-0058, ADR-0068, ADR-0072, ADR-0081, ADR-0082
- **Milestone:** M4.0a / platform

## Context

Shrinkonauts is a static Vite build deployed to GitHub Pages under
`/shrinkonauts/`. It has two HTML entry points: the shared-screen game
(`index.html`) and the phone controller (`controller.html`). All gameplay
content is same-origin static JSON, sprites, fonts, and audio; saves and
settings live in `localStorage`. The only server dependency is the Cloudflare
Worker/Durable Object relay used when a player selects a phone-controller slot.

The runtime footprint is small enough to cache: excluding the generated GDD
gallery, the production build is roughly 10 MB, including the ~1.96 MB game
bundle and the two packs. The GDD gallery, by contrast, is a generated 76 MB
design document copied into `dist/gdd/`. The repository already builds both
entries from the same Vite output and resolves content through relative
`BASE_URL` paths.

ADR-0068 permits the controller page to be installed as a PWA/home-screen
shortcut only if it remains static and cache-safe. That decision did not define
the game shell, the precache boundary, navigation fallback behaviour, or the
update lifecycle.

## Decision

### 1. Two manifests, one per entry

`public/manifest.webmanifest` describes the game shell (`start_url: "./"`) and
`public/controller.webmanifest` describes the controller
(`start_url: "./controller.html"`). Each HTML entry links its own manifest.
The manifests are committed static files, not injected by the build, so the
two installed apps have distinct identities and start URLs.

### 2. The service worker precaches runtime content only

A generated Workbox service worker precaches the two HTML entries, hashed
JS/CSS, fonts, both pack manifests, hub content, syllabi, icons, and the PWA
manifests. It explicitly excludes:

- `gdd/**` — the generated GDD gallery is a design document, not runtime
  content, and would make installation download 76 MB.
- `content/dev/**` — the M0 regression fixture is not booted by the app.
- The relay origin — no runtime-caching rule matches `workers.dev` or the
  WebSocket upgrade. Co-op remains a live network feature.

The precache is size-checked at build time to catch both a missing pack and an
accidental gallery inclusion.

### 3. No navigation fallback

The app has no client-side routes; it uses query flags such as `?skipMenu=1`,
`?pack=...`, and `?assets=...`. The service worker therefore sets
`navigateFallback: null` and ignores URL query parameters during precache
matching. This:

- lets offline direct boot work with the existing query flags;
- prevents `/gdd/` pages from being served the game shell;
- keeps `controller.html` an independent document.

### 4. Updates are prompted, never automatic

`registerType: "prompt"` keeps the old worker active until the user chooses to
reload. The hub shows "A new version is ready" with a reload action. The game
checks for updates when the page becomes visible and on an hourly interval.
An update is never applied during a run, and the hub is the only place the
reload action exists.

### 5. Offline scope is explicit

The hub, solo play, and keyboard co-op work offline because all of their content
is precached. Phone-controller co-op does not: the controller and host still
need the relay. If the browser reports offline when a phone slot is selected,
the hub explains that the slot needs a connection and suggests switching to
Keyboard. The PWA does not promise offline co-op.

### 6. Installation is optional and platform-aware

The hub offers an install action when Chromium exposes
`beforeinstallprompt`. iOS Safari has no install event, so the hub shows a
short Share → Add to Home Screen hint instead. The controller page is
installable from the browser menu but does not show an install call to action,
because its useful launch path is a room ticket or the join form.

Installed standalone mode requests `navigator.storage.persist()` best-effort.
This is the safest home for local saves; it is not a backup. Evidence export
remains the durable record.

## Consequences

- The first install downloads about 8.7 MiB of precache. Later updates only
  fetch changed revisions.
- The GDD gallery remains online-only. A service worker controls the whole
  `/shrinkonauts/` scope, but gallery requests fall through to the network.
- The game is the desktop/laptop install target; the phone install target is
  the controller. Installing the game on a phone does not add on-screen
  gameplay controls.
- Two installed apps share one origin and one service worker but have distinct
  manifests and start URLs.
- No push notifications, background sync, or periodic background fetch are
  introduced.
- The relay, WebSocket traffic, device tokens, and room tickets are never
  cached.
- The existing `localStorage` save model is unchanged. Installed iOS web apps
  are exempt from Safari's seven-day script-storage eviction, but users should
  still not treat the device as the only copy of evidence.

## Alternatives considered

- **Installable shell without a service worker.** Simpler and still installable
  in current Chromium, but it would show the browser's offline error and would
  not satisfy the classroom offline goal.
- **Precache the GDD gallery.** Rejected: 76 MB install cost and no runtime
  benefit.
- **One shared manifest.** Rejected: installing from the controller would open
  the game hub, and the two apps need different names, themes, and start URLs.
- **Automatic updates.** Rejected: a reload during a run loses the player's
  flow and the launch transition, even though saves are versioned.
- **Runtime caching only.** Rejected: the first offline launch would fail
  before the player has visited every room.

## Validation

- `npm run build` emits `sw.js`, both manifests, and the four icon sizes, and
  runs `scripts/check-pwa-bundle.ts`.
- `scripts/check-pwa-bundle.ts` verifies the precache contents, excludes
  `gdd/**` and `content/dev/**`, rejects a navigation fallback, checks icon
  dimensions, and validates both manifests.
- `npm run smoke:pwa` serves `dist/` under `/shrinkonauts/` and verifies:
  service-worker scope, installability (ignoring Chrome's incognito error),
  offline hub and solo start, offline direct boot with query flags, offline
  controller shell, and GDD isolation.
- `npm test`, `npm run pack:validate`, `npm run smoke:e2e`, and
  `npm run smoke:controller` remain green.
- Manual iOS Safari install and offline launch are required before acceptance.

## References

- [`docs/adr-hub/`](../adr-hub/README.md) — pre-game shell and per-pack saves.
- [`docs/adr-controller/0068-controller-session-pairing-and-trust.md`](../adr-controller/0068-controller-session-pairing-and-trust.md)
  — controller page boundary and optional installation.
- [`docs/adr-controller/0081-same-room-shared-screen-multiplayer.md`](../adr-controller/0081-same-room-shared-screen-multiplayer.md)
  — same-room co-op and the relay boundary.
- [`docs/adr-presentation/0072-asset-fidelity-tiers-and-encoding.md`](0072-asset-fidelity-tiers-and-encoding.md)
  — runtime asset sizes and encoding.
- [`README.md`](../../README.md) — install and offline instructions.
