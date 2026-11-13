<script>
  import { ago } from "./formatters";

  /* Panel shell: rule-topped section, small-caps mono heading, the panel's
     content, and its live status line. The status derivation is shared:
     <label> + age on success, the failure + cache age on error. Panels can
     append a suffix (e.g. PM2.5 failing alongside healthy PSI) and keep
     their historical status element ids. */
  let {
    heading,
    panel,
    statusLabel,
    statusExtra = () => "",
    statusId = undefined,
    id = undefined,
    state,
    children,
  } = $props();

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

<style>
  section {
    margin-block: 2.1rem;
    padding-block-start: 0.85rem;
    border-block-start: 1px solid var(--rule);
    animation: none; /* the site rises bare `section`s; the board sits still */
  }

  h2 {
    font-family: "Space Mono", monospace;
    font-size: 0.68rem;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 0.85rem;
  }

  p.status {
    font-family: "Space Mono", monospace;
    font-size: 0.72rem;
    color: var(--muted);
    margin: 0.5rem 0 0;
  }

  p.status.err {
    color: var(--mark);
  }
</style>
