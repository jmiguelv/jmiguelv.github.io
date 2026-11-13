<script lang="ts">
  import { ago } from "./formatters";
  import type { Snippet } from "svelte";
  import type { FeedPayloads } from "./feeds";
  import type { NowState } from "./state.svelte";

  /* Panel shell: rule-topped section, small-caps mono heading, the panel's
     content, and its live status line. The status derivation is shared:
     <label> + age on success, the failure + cache age on error. Panels can
     append a suffix (e.g. PM2.5 failing alongside healthy PSI) and keep
     their historical status element ids. */
  interface Props {
    heading: string;
    panel: keyof FeedPayloads;
    statusLabel?: string;
    statusExtra?: () => string;
    statusId?: string;
    id?: string;
    state: NowState;
    children?: Snippet;
  }

  let {
    heading,
    panel,
    statusLabel,
    statusExtra = () => "",
    statusId = undefined,
    id = undefined,
    state,
    children,
  }: Props = $props();

  let status = $derived.by(() => {
    state.tick; /* ages re-derive on the island's 30s clock */
    const entry = state.store[panel];
    const err = state.errs[panel];
    const extra = statusExtra();
    if (err) {
      return {
        text:
          "unavailable: " +
          err +
          " — showing data from " +
          ago(entry && entry.at) +
          extra,
        cls: "status err",
      };
    }
    return {
      text: statusLabel + " " + ago(entry && entry.at) + extra,
      cls: "status",
    };
  });
</script>

<section {id}>
  <h2>{heading}</h2>
  {@render children?.()}
  {#if statusLabel}
    <p class={status.cls} id={statusId} role="status">{status.text}</p>
  {/if}
</section>
