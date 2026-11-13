# Agent Notes

This is a small Astro 6 static site (personal portfolio) deployed to GitHub Pages.

## Toolchain

- Package manager: `pnpm` 11.0.4 (pinned in `package.json#packageManager`).
- UI island framework: Svelte 5 via `@astrojs/svelte` (the now board is the
  only island; everything else stays static Astro). Prettier formats
  `.svelte` via `prettier-plugin-svelte`; ESLint uses `eslint-plugin-svelte`.
- Node: CI uses Node 22.
- Linter: ESLint (`eslint.config.mjs`) with `@eslint/js`, `typescript-eslint`, and `eslint-plugin-astro`.
- Formatter: Prettier (`.prettierrc`) with `prettier-plugin-astro`.
- Test runner: Vitest 4 (`vitest`) with `gray-matter` for frontmatter parsing.

## Useful commands

- `pnpm dev` — start dev server.
- `pnpm build` — runs `astro check && astro build`; type-checks and writes to `dist/`.
- `pnpm preview` — serve the `dist/` build locally.
- `pnpm lint` — run ESLint.
- `pnpm format` — format with Prettier.
- `pnpm format:check` — check formatting without writing.
- `pnpm test` — run content schema and sort order tests (excludes link rot).
- `pnpm check:links` — run link rot checker separately (fetches 100+ external URLs, slow).
- `pnpm astro ...` — run Astro CLI commands directly.

## Pre-commit checklist

Before committing, run `pnpm format` and `pnpm lint` to match CI. CI runs `pnpm format:check` (no auto-fix), so unformatted code will fail the pipeline.

## Deploy

- GitHub Actions `.github/workflows/deploy.yml` builds and deploys on every push to `main`.
- CI runs `pnpm install --frozen-lockfile`, then `pnpm lint`, `pnpm format:check`, `pnpm test`, and `pnpm build`; upload path is `./dist`. Link rot checks are excluded from CI (run manually via `pnpm check:links`).
- `api/bus.js` is a Vercel serverless function (LTA DataMall proxy for `/lab/now/`), not part of the Pages build. It needs the `LTA_ACCOUNT_KEY` env var on Vercel; `vercel.json` pins its region to `sin1`. Pages deploys ignore this directory.

## Project structure

- `astro.config.mjs`: static site, `site: https://jmiguelv.github.io`, `trailingSlash: 'ignore'`, directory build output.
- `src/pages/index.astro`: single-page entrypoint.
- `src/layouts/Base.astro`: root layout; imports fonts and `src/styles/global.css`.
- `src/content.config.ts`: two Astro content collections:
  - `projects` — Markdown in `src/content/projects/`
  - `publications` — Markdown in `src/content/publications/`
- Zod schemas for both collections live in `src/schemas.ts` (imported by `content.config.ts` and tests).
- Sort comparators for projects and publications live in `src/utils/sort.ts` (imported by `index.astro` and tests).
- Content is rendered via `getCollection()` and passed to `ProjectItem.astro` / `PublicationItem.astro`. See `src/schemas.ts` for the Zod schema.
- Tests live in `tests/`:
  - `content.test.ts` — validates all collection entries against Zod schemas.
  - `schemas.test.ts` — unit tests for the Zod schemas (non-empty strings, year ordering).
  - `sort.test.ts` — unit tests for project and publication sort comparators.
  - `links.test.ts` — link rot checker (run separately, not in CI).
  - `helpers.ts` / `helpers.test.ts` — shared test utilities (recursive markdown file loading) and their tests; fixtures in `tests/fixtures/`.
- `tsconfig.json` extends `astro/tsconfigs/strict` and includes `.astro/types.d.ts` for generated collection types.

## Prototypes (`/lab/`)

Two kinds of lab entry live under `/lab/`, both indexed automatically by `/lab/`:

- **Static prototypes** at `public/lab/<name>/index.html`, served verbatim (no
  Astro processing; inline CSS/JS stays intact). Contract: a `<title>` and a
  non-empty `<meta name="description">` — the index reads them from the file.
- **Astro lab pages** at `src/pages/lab/<name>.astro` (not `index.astro`).
  Contract: exactly one `<h1>` (the display name) and a `description` attr on
  `<Base>` — the index reads them from the source.

`src/utils/lab.ts` enforces both contracts loudly at build time
(`tests/lab.test.ts` covers them). Drop a file in either place and it
appears on the index; miss the contract and the build fails.

Static-prototype gotchas:

- Prettier formats them; run `pnpm format` after editing, or CI's `pnpm format:check` fails.
- After formatting, syntax-check inline scripts (extract the `<script>` body and run `node --check`) — a bad format pass can silently break the page.
- They are not Astro pages, so the sitemap will not list them.

`/lab/now/` is an Astro page (`src/pages/lab/now.astro`) whose entire UI
is one Svelte 5 island (`src/components/now/`), mounted with
`client:load`:

- `now.astro` keeps only the frame: `Base`, metadata, `noindex`, the
  `labTitle` export (the `/lab/` index reads it — it renders inside the
  island at runtime, where markup scraping can't reach), the palette
  `:root` vars, the 16px root pin, and the page-shared utility styles
  (`.status`, `.meta`, `.btn`) under `.now-board`.
- `state.svelte.ts` owns all reactivity and mutations: one `$state`
  object built by `createNowState()`, plus `loadSaved`/`persist`/`refresh`/
  `fetchBuses`/`applyConf`/`wipe` as plain functions. `NowBoard.svelte`
  owns the clock (30s tick, 5-min feeds, 1-min visible bus polls) and
  passes the state object to `Panel.svelte` (the shared section shell)
  and the panel components as a single prop.
- The TypeScript modules are the island's real contracts: `feeds.ts`
  holds the endpoint pins plus payload interfaces for every feed
  (verified against live responses); `formatters.ts`, `conf.ts` (the
  versioned JSON funnel with true discriminated-union types), and
  `state.svelte.ts` (typed `NowState`) are framework-free and
  unit-tested directly. Endpoint URLs are pinned there and in tests —
  the 2026-11-10 `/24-hour-forecast` 403 typo incident is why.
- The island renders through `Base` (metadata, analytics, site fonts)
  and is excluded from the sitemap via the `astro.config.mjs` filter.
- `tests/now-board.test.ts` mounts the real component tree (Svelte 5
  `mount`) with recorded fetch and seeded localStorage — the successor
  of the old VM smoke test, same rendered-text assertions.
  `tests/now-conf.test.ts` covers the conf funnel and endpoint pins.

Svelte gotchas this repo's toolchain has hit (all documented fixes):

- **Never name a local binding `state` in a component that also calls
  `$state(...)`** — the runes auto-detector reads the pair as legacy
  store syntax and compiles the whole file legacy (runtime dies with
  `store_invalid_shape`). The island calls its state object `board`
  internally; children destructure `{ state: board }`.
- `svelte.config.js` pins `runes: true` (`@sveltejs/vite-plugin-svelte`
  AST auto-detection stays out of the picture).
- `vitest.config.mts` sets `pool: "vmForks"` + `environment: "jsdom"`:
  vitest 4 otherwise runs modules through a server-consumer environment,
  which makes the svelte plugin emit server builds. The vmForks pool
  gets `consumer: "client"` from vitest itself, and its fresh VM context
  also sidesteps this Node runtime's experimental (broken) globals for
  `window`/`localStorage` shadowing vitest's jsdom population. The jsdom
  `url` option exists because an opaque origin has no storage.
- ESLint turns off `no-unused-expressions` for `.svelte` (the `board.tick;`
  dependency-touch idiom is legal rune usage) and declares the browser
  globals island scripts read.

## pnpm workspace quirks

- `pnpm-workspace.yaml` allows native builds for `esbuild` and `sharp` and pins `rollup` to `4.61.1` via `overrides`. Run `pnpm install` after changing this file.
