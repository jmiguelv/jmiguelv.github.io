import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
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
    /* The now board's script is runtime-DOM code, verified end to end by the
       VM boot smoke test (tests/now-lab.test.ts) — the deliberate ts-nocheck
       keeps astro check out of a strict-null retrofit. */
    files: ["src/pages/lab/now.astro", "src/pages/lab/now.astro/**"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
);
