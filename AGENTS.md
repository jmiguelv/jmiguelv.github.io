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

## Deploy

- GitHub Actions `.github/workflows/deploy.yml` builds and deploys on every push to `main`.
- CI runs `pnpm install --frozen-lockfile`, then `pnpm lint`, `pnpm format:check`, `pnpm test`, and `pnpm build`; upload path is `./dist`. Link rot checks are excluded from CI (run manually via `pnpm check:links`).

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

## pnpm workspace quirks

- `pnpm-workspace.yaml` allows native builds for `esbuild` and `sharp` and pins `rollup` to `4.61.1` via `overrides`. Run `pnpm install` after changing this file.
