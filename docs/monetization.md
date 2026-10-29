# Monetization — Shrinkonauts

**Status:** draft v0.1 · 29 October 2026
**Owner:** Johannes/Marie (GDD), Snorre (technical fit)
**Scope:** the GDD's mandatory **Monetization** section (T-GDD / L-G6) and the IAP plan
**Constraint source:** [`base-game/requirements.md`](shrinkonauts/base-game/requirements.md), [`base-game/architecture.md`](shrinkonauts/base-game/architecture.md), [`DESIGN.md`](shrinkonauts/DESIGN.md)

---

## 1. Model in one line

**Free prologue → one-time premium base game → paid gamepack expansions → classroom licence.**

No ads, no currency, no consumables. Every purchase unlocks content permanently.

---

## 2. Why this model

| Reason | Fit |
|---|---|
| The game is about cartridges in a rig | A new gamepack *is* a new cartridge; DLC is part of the fiction |
| The pack boundary is a hard requirement (G7) | A new pack loads without engine changes, so paid content is a clean unit |
| No backend, accounts, or telemetry | Storefront-handled purchases are cheaper and safer than a live economy |
| Audience is 12+ and classroom-facing | Visible pricing and a real demo survive teacher and parent review |
| Evidence, hints, and debrief are the learning product | They stay free; the game sells content, never progress or answers |

---

## 3. Tiers and pricing

Prices are placeholders for the GDD, not a commitment.

| Tier | Contents | Price |
|---|---|---|
| **Free prologue** | The existing `03-nerve-forest` slice: dialogue, scan, one puzzle, debrief | Free |
| **Base game** | Rig/console + full anatomy pack (5 levels, solo and local co-op, map, evidence export) | 149 NOK / ~$14.99 |
| **Expansion gamepack** | One new system per cartridge: *Silicon*, circulatory, respiratory, immune | 49–79 NOK / ~$4.99–7.99 |
| **Bundle** | Base game + all current packs | ~299 NOK / ~$29.99 |
| **Classroom licence** | All packs for teacher/school use, evidence export, future dashboard | ~990 NOK/teacher/year, or site licence |

---

## 4. In-app purchases

Treat these as **non-consumable content unlocks** (DLC-style), not free-to-play IAP.

| Product | Type | Contents | Rule |
|---|---|---|---|
| `pack.silicon` | Non-consumable | Silicon transfer pack | Permanent, restoreable |
| `pack.circulatory` | Non-consumable | Circulatory system pack | Permanent |
| `pack.respiratory` | Non-consumable | Respiratory system pack | Permanent |
| `pack.immune` | Non-consumable | Immune system pack | Permanent |
| `bundle.all` | Bundle | Base + all packs | Best value per pack |
| `supporter.cosmetic` | Cosmetic only | Suit palette/skin set | No gameplay or learning effect |
| `classroom.license` | Term licence | All packs + export | Not sold to under-18 individuals |

### Purchase rules

1. The **cartridge shelf** is the only store surface.
2. **No purchase prompt** during a level, puzzle, or debrief.
3. Every locked cartridge shows its learning objectives and one free sample level.
4. Entitlements live with **settings/licence state**, not the run save.
5. **Classroom mode** unlocks all packs and hides purchase UI.
6. **Restore purchases** is always available; refunds follow the storefront.
7. If mobile is added later, add a parental gate and follow Apple/Google rules. It is not a current requirement.

### Deliberately excluded

No ads · no loot boxes · no energy or stamina · no consumable hints · no pay-to-skip puzzles · no premium currency · no selling learner data.

---

## 5. Technical shape (minimum viable)

Keep commerce out of the domain and out of `game/runtime.ts`.

- Add an `entitlements` interface: `isOwned(packId)`, `purchase(packId)`, `restore()`.
- Add a `platform/billing` adapter: `NoopBilling` (dev: everything owned), `WebBilling` (storefront redirect), later `SteamBilling`.
- Add an optional `commerce: { productId, priceTier, demoLevel? }` block to the pack manifest, with a minor schema bump and validator tests for locked/unlocked packs (same pattern as ADR-0008).
- Gate **pack loading only**. Levels, evidence, debrief, hints, accessibility, and save data are unaffected.
- For the prototype and the 2-minute video, simulate purchases with a URL flag such as `?iap=sim`.

---

## 6. Risks and open questions

| Risk / question | Note |
|---|---|
| Platform not final | Browser/itch.io and Steam both support one-time purchases; mobile would change the IAP wording |
| Classroom as a real sales target | If yes, lead with the classroom licence; if no, treat it as a future tier |
| Store fees | Budget roughly 30% (15% at higher volume) on storefront revenue |
| VAT and consumer law | Prices must be shown inclusive of VAT in Norway; refunds follow the store |
| Trust | Any ads or consumables would undermine the classroom positioning |

---

## 7. GDD-ready summary

> *Shrinkonauts* uses a premium, one-time-purchase model. A free browser prologue contains the complete Nerve Forest slice so players and teachers can evaluate the game before paying. The base game is a single purchase and includes the rig and the full anatomy gamepack. Additional systems ship as paid gamepack expansions — starting with *Silicon* — sold individually or as a bundle. Schools can buy a classroom licence that unlocks all packs and keeps evidence export available. In-app purchases are non-consumable content unlocks only: no ads, no currency, no consumables, no loot boxes, and no purchase prompts during play. Learning evidence, hints, debriefs, and accessibility settings are never paywalled. This matches the game's cartridge fiction and pack architecture, and keeps a 12+ educational product trustworthy for teachers and parents.
