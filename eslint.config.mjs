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
    /* eslint-plugin-svelte claims *.svelte.ts modules for its own parser,
       which cannot read TypeScript — the runes module is plain TS plus
       $state, so parse it with the TS parser like every other .ts. */
    files: ["**/*.svelte.ts"],
    languageOptions: {
      parser: tseslint.parser,
    },
  },
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
    files: ["**/*.svelte", "src/components/now/**/*.ts"],
    languageOptions: {
      /* svelte-eslint-parser delegates <script lang="ts"> parsing to
         the parser given here — without it, TS syntax in components fails */
      parserOptions: {
        parser: tseslint.parser,
      },
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
      /* TS type references live in erased positions; no-undef misreads them */
      "no-undef": "off",
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
