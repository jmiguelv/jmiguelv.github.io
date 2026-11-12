import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import svelte from "eslint-plugin-svelte";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  ...svelte.configs["flat/recommended"],
  {
    ignores: ["dist/", ".astro/", "node_modules/"],
  },
  {
    /* api/ functions run on Vercel serverless, not in the site build — tell
       ESLint which globals exist there. */
    files: ["api/**/*.js"],
    languageOptions: {
      globals: {
        fetch: "readonly",
        Response: "readonly",
        URL: "readonly",
        AbortSignal: "readonly",
        console: "readonly",
        process: "readonly",
      },
      sourceType: "module",
    },
  },
  {
    /* The now board island — Svelte 5 runes. Script blocks run in the
       browser: they need browser globals, and `board.tick;` style reads are
       deliberate (they wire the 30s clock into derivations), so the
       unused-expression rule is off for .svelte files. */
    files: ["**/*.svelte", "src/components/now/**/*.js"],
    languageOptions: {
      globals: {
        console: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        FileReader: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        Blob: "readonly",
        fetch: "readonly",
        AbortController: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  {
    /* Lab pages export labTitle as a deliberate build-time contract: the
       /lab/ index reads it to list the experiment (src/utils/lab.ts). */
    files: ["src/pages/lab/**/*.astro", "tests/fixtures/lab-pages*/**/*.astro"],
    rules: {
      "astro/no-exports-from-components": "off",
    },
  },
);
