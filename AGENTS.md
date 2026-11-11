# Agent Notes

This is a small Astro 6 static site (personal portfolio) deployed to GitHub Pages.

## Toolchain

- Package manager: `pnpm` 11.0.4 (pinned in `package.json#packageManager`).
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

`/lab/now/` is an Astro page (`src/pages/lab/now.astro`) split into
`src/components/now/`:

- The page owns the document landmarks (`<h1>`, masthead, `<main>`, footline),
  the `// @ts-nocheck` controller `<script>` (one block so the VM smoke test
  can extract it), and the shared-runtime styles (`.status`, `.meta`, `.btn`),
  anchored under `.now-board` in an `is:global` block — that block also pins
  this page's 16px root, body paint and `.wrap` padding.
- `Panel.astro` renders the shell every panel shares (section, mono h2,
  status line) — panels are `VerdictPanel`, `BusPanel`, `AirPanel`,
  `TodayPanel`, `OutlookPanel`, `SettingsPanel`.
- Scoping convention: styles for template-owned DOM are plain scoped
  `<style>`s; styles for DOM the controller builds at runtime (stop cards,
  dots, chips, stops-list entries) live in that panel's `is:global`
  `<style>`, still anchored under `.now-board` so they cannot ship elsewhere.
- It renders through `Base` (fonts — `global.css` already declares the same
  `@font-face`s, metadata, analytics) and is `noindex` via Base's prop;
  `astro.config.mjs` filters it from the sitemap.
- The VM boot smoke test (`tests/now-lab.test.ts`) boots the first
  `<script>` block from the page source against a stub DOM and feed
  fixtures — the controller's element-id contract is the reason the built
  markup must keep ids/classes stable. Extend it when changing the page.

## pnpm workspace quirks

- `pnpm-workspace.yaml` allows native builds for `esbuild` and `sharp` and pins `rollup` to `4.61.1` via `overrides`. Run `pnpm install` after changing this file.
