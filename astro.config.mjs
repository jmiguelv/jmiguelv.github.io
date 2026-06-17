import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jmiguelv.github.io',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
