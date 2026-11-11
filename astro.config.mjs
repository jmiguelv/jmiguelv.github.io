import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://jmiguelv.github.io",
  trailingSlash: "ignore",
  build: {
    format: "directory",
  },
  integrations: [
    sitemap({
      /* /lab/now/ is marked noindex — a page asked not to be listed must
         not sit in the sitemap either. filter() receives the full URL. */
      filter: (page) => !page.endsWith("/lab/now/"),
    }),
  ],
});
