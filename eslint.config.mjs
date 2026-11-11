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
    /* proxy/ files run on serverless/worker platforms, not in the site —
       tell ESLint which globals exist there. */
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
);
