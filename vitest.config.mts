import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

/* Vitest 4 runs the module graph through vite environments whose consumer
   defaults to "server", which makes the svelte plugin compile every
   component for SSR — unusable for component tests. The vmForks pool is the
   supported answer: vitest gives its __vitest_vm__ environment
   consumer: "client" natively, and the fresh VM context also sidesteps
   this Node runtime's experimental window/localStorage globals shadowing
   everything. The jsdom URL matters: an opaque origin has no storage.
   The svelte alias pins the client entry for bare imports under Node
   resolution; runes are forced in svelte.config.js and here as belt and
   braces for the cached transform pipelines. */
export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        runes: true,
      },
    }),
  ],
  resolve: {
    conditions: ["browser"],
    alias: [
      {
        find: /^svelte$/,
        replacement: new URL(
          "./node_modules/svelte/src/index-client.js",
          import.meta.url,
        ).pathname,
      },
    ],
  },
  test: {
    include: ["tests/**/*.test.ts"],
    pool: "vmForks",
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "https://jmiguelv.github.io/lab/now/",
      },
    },
  },
});
