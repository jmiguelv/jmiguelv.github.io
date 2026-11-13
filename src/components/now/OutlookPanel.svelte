<script lang="ts">
  import Panel from "./Panel.svelte";

  /* Outlook: tomorrow and the day after, straight off the 4-day feed. */
  let { state }: { state: NowState } = $props();

  let forecasts = $derived(state.store.w4?.d?.items?.[0]?.forecasts ?? []);
</script>

<Panel heading="outlook" panel="w4" statusLabel="fetched" {state}>
  <div id="days">
    {#if !forecasts.length}
      <p class="empty">{state.errs.w4 ? "Outlook unavailable." : "Loading…"}</p>
    {:else}
      {#each forecasts.slice(0, 2) as d (d.date)}
        <p class="day">
          {new Date(d.date + "T00:00:00+08:00").toLocaleDateString([], {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
          · {d.forecast || "—"}{d.temperature
            ? " · " + d.temperature.low + "–" + d.temperature.high + "°C"
            : ""}
        </p>
      {/each}
    {/if}
  </div>
</Panel>
