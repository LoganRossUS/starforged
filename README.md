# Forge Companion

An **unofficial**, fully client-side companion web app for playing
[_Ironsworn: Starforged_](https://ironswornrpg.com) solo or co-op — from character
creation through play. No backend, no server, no database: everything lives in your
browser, and your campaign saves to a downloadable JSON file.

> **Unaffiliated fan tool.** Forge Companion is not affiliated with, endorsed by, or
> sponsored by the publisher or author of Ironsworn / Starforged. See
> [Licensing](#licensing--attribution).

## Features

- **Real 3D physics dice.** Action, progress, and oracle rolls throw actual tumbling
  dice ([@3d-dice/dice-box](https://github.com/3d-dice/dice-box), Three.js + cannon-es).
  Full outcome resolution: strong/weak/miss, matches, **burn momentum**, and
  **negative-momentum cancellation**.
- **Setup wizard** — guided flow through all 14 setting truths, character basics, the
  standard stat array, starting assets (Starship + 3), background vow, and your first
  sector + quest vow.
- **Interactive character sheet** — stats, condition meters, momentum (with auto max/reset
  from impacts), legacy tracks (auto-XP), impacts, progress tracks (rank-aware marking),
  and equipped asset cards.
- **Full asset library** — every Starforged asset, all types, browsable + searchable, with
  editable fields, toggleable abilities, condition meters and counters.
- **Full oracle library** — the complete oracle tree, searchable, with one-tap rolling and
  an Ask-the-Oracle yes/no widget. Results can be sent to your notes.
- **Move reference** — every move, full text, with contextual action/progress rollers.
- **Sector map builder** — a pan/zoom hex grid for placing and detailing locations.
- **Connections** worksheet and a Markdown **notebook**.
- **Save / load** to JSON, with localStorage autosave and schema migrations.

## Getting started

```bash
npm install        # also fetches the Datasworn dataset (a dev dependency)
npm run dev        # start the dev server
npm run build      # produce a static site in dist/
npm run preview    # preview the production build
```

`npm run build` / the `dist/` output is a fully static site — host it anywhere.

## Content pipeline

Game content (moves, oracles, assets, truths) comes from the official, CC-BY-licensed
[**Datasworn**](https://github.com/rsek/datasworn) dataset, bundled via the
`@datasworn/starforged` package and transformed into normalized JSON the app imports.

```bash
npm run build:content
```

This runs `scripts/build-content.mjs`, which reads
`node_modules/@datasworn/starforged/json/starforged.json` and writes normalized files to
`src/data/generated/`:

- `moves.json` — move categories + moves (trigger, text, outcomes, stat options)
- `assets.json` — all assets with options, controls (meters/counters), and abilities
- `oracles.json` — the full oracle collection/table tree
- `truths.json` — the 14 setting-truth categories with options and sub-tables
- `meta.json` — title/authors/license for attribution

The generated files are committed so the app works offline with no runtime fetching. To
update content, bump `@datasworn/starforged` and re-run `npm run build:content`.

The 3D dice assets (physics WASM + dice theme) live in `public/assets/dice-box/`.

## Project structure

```
scripts/build-content.mjs     Datasworn -> normalized content
src/data/generated/           generated content JSON (committed)
src/content/                  typed content accessors
src/store/                    zustand store, types, defaults, logic, migrations
src/components/               shared UI (HexPanel, Meter, TickTrack, Markdown, Icons…)
src/features/
  dice/                       3D dice roller + roll resolution
  sheet/                      character sheet + progress tracks
  assets/                     asset library + asset cards
  oracles/                    oracle browser + ask-the-oracle
  moves/                      move reference
  wizard/                     setup wizard
  sector/                     hex map builder
  connections/                connections worksheet
  notes/                      markdown notebook
  save/                       import / export / new campaign
  credits/                    attribution + license
src/styles/                   design tokens + global styles
```

## Tech stack

Vite · React · TypeScript · Zustand · @3d-dice/dice-box. Styling uses centralized CSS
design tokens (`src/styles/tokens.css`). Fonts are open-licensed Google Fonts
(Saira Condensed, Barlow, JetBrains Mono) chosen to evoke — not reproduce — the book's
type.

## Licensing & attribution

- **Game text** (moves, oracles, assets, truths) is from _Ironsworn: Starforged_ by
  **Shawn Tomkin**, via the **Datasworn** dataset, licensed under
  [**CC BY 4.0**](https://creativecommons.org/licenses/by/4.0/). It is reproduced here
  with attribution.
- **Not included:** the official logos, painted illustrations, and the
  "Ironsworn"/"Starforged" wordmarks and trade dress are **not** CC-licensed and are not
  reproduced. All visuals here (palette, typography, hex motifs, icons, dice) are original
  recreations in a similar spirit.
- This app's own source code is provided as a fan project.

A full credits/attribution screen with the CC BY 4.0 notice is built into the app.
