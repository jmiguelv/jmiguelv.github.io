# Miguel Vieira — Portfolio

Personal portfolio site, built with [Astro](https://astro.build) and deployed to GitHub Pages.

## Tech

- Astro 6 (static site)
- pnpm 11 / Node 22
- Content collections for projects and publications
- Vitest for content schema validation and sort order tests

## Develop

```sh
pnpm install
pnpm dev
```

## Build

```sh
pnpm build      # astro check && astro build → dist/
pnpm preview    # serve the dist/ build locally
```

## Test

```sh
pnpm test          # content schema + sort order tests (fast)
pnpm check:links   # link rot checker — fetches 100+ external URLs (slow, not in CI)
```

## Deploy

Pushes to `main` trigger the GitHub Actions workflow (`.github/workflows/deploy.yml`) which lints, runs tests, builds, and publishes to GitHub Pages.

## License

[MIT](LICENSE)
