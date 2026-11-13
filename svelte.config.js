export default {
  /* The now board island is written entirely with Svelte 5 runes
     ($state/$derived/$props, .svelte.js modules). Making runes explicit
     keeps the AST-based auto-detection out of the picture everywhere —
     vitest's compile pipeline and the Astro integration both read this. */
  compilerOptions: {
    runes: true,
  },
};
