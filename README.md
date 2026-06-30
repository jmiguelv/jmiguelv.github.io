# Miguel Vieira — Portfolio

Personal portfolio site, built with [Astro](https://astro.build) and deployed to GitHub Pages.

## Tech

- Astro 6 (static site)
- pnpm 11 / Node 22
- Content collections for projects and publications

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

## Deploy

Pushes to `main` trigger the GitHub Actions workflow (`.github/workflows/deploy.yml`) which builds and publishes to GitHub Pages.

## License

[MIT](LICENSE)
