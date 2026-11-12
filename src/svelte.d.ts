/* Ambient types for importing .svelte components from .astro/TS — the
   @astrojs/svelte integration compiles the components; here we only teach
   the type-checker what an import yields. */
declare module "*.svelte" {
  import type { Component } from "svelte";
  const component: Component<Record<string, unknown>>;
  export default component;
}
