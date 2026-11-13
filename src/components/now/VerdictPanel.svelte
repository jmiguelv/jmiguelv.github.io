<script lang="ts">
  import Panel from "./Panel.svelte";
  import { hhmm, umbrellaFor } from "./formatters";

  /* "heading out": the 2-hour nowcast for the chosen area, with the
     umbrella verdict. Derives straight from the cached feed — never
     fetches. */
  let { state }: { state: NowState } = $props();

  let item = $derived(state.store.w2h?.d?.items?.[0] ?? null);
  let mine = $derived.by(() => {
    const forecasts = (item && item.forecasts) || [];
    for (let i = 0; i < forecasts.length; i++) {
      if (forecasts[i].area === state.settings.area) return forecasts[i];
    }
    return null;
  });
</script>

<Panel
  id="sec-now"
  heading="heading out"
  panel="w2h"
  statusLabel="forecast fetched"
  statusId="now-status"
  {state}
>
  {#if !item}
    <p id="verdict-big">
      {state.errs.w2h ? "Weather unavailable" : "Loading…"}
    </p>
    <p id="verdict-guide"></p>
    <p class="meta" id="now-meta"></p>
  {:else if mine}
    <p id="verdict-big">{mine.forecast}</p>
    <p id="verdict-guide">{umbrellaFor(mine.forecast)}</p>
    <p class="meta" id="now-meta">
      {state.settings.area} · valid until
      {hhmm(item.valid_period && item.valid_period.end)}
    </p>
  {:else}
    <p id="verdict-big">Pick your area</p>
    <p id="verdict-guide">
      {state.settings.area
        ? "Saved area '" +
          state.settings.area +
          "' is missing from this forecast — repick in settings."
        : "The 2-hour nowcast needs an area — choose one in settings."}
    </p>
    <p class="meta" id="now-meta"></p>
  {/if}
</Panel>
