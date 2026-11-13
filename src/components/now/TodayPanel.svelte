<script lang="ts">
  import Panel from "./Panel.svelte";
  import { hhmm } from "./formatters";

  /* Today: the 24-hour forecast — general summary, chips, and the weather
     period currently in force for the chosen region. The period check
     reads the island clock, so the row rolls over on the 30s tick rather
     than waiting for a fetch. */
  let { state }: { state: NowState } = $props();

  let item = $derived(state.store.w24?.d?.items?.[0] ?? null);
  let g = $derived((item && item.general) || {});
  let period = $derived.by(() => {
    state.tick; /* the current window depends on wall time */
    const periods = (item && item.periods) || [];
    const now = Date.now();
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      const start = new Date(p.time.start).getTime();
      const end = new Date(p.time.end).getTime();
      if (
        now >= start &&
        now <= end &&
        p.regions &&
        p.regions[state.settings.region]
      )
        return p;
    }
    return null;
  });
</script>

<Panel
  heading="today"
  panel="w24"
  statusLabel="fetched"
  statusId="today-status"
  {state}
>
  <div id="today">
    {#if !item}
      <p class="empty">
        {state.errs.w24 ? "Today's forecast unavailable." : "Loading…"}
      </p>
    {:else}
      <p class="summary">{g.forecast || "—"}</p>
      <div class="chips">
        {#if g.temperature}
          <span class="chip"
            ><small>temp</small>
            <b>{g.temperature.low}–{g.temperature.high}°C</b></span
          >
        {/if}
        {#if g.relative_humidity}
          <span class="chip"
            ><small>humidity</small>
            <b>{g.relative_humidity.low}–{g.relative_humidity.high}%</b></span
          >
        {/if}
        {#if g.wind?.speed}
          <span class="chip"
            ><small>wind</small>
            <b
              >{g.wind.speed.low}–{g.wind.speed.high} km/h{g.wind.direction &&
              g.wind.direction !== "VARIABLE"
                ? " " + g.wind.direction
                : ""}</b
            ></span
          >
        {/if}
      </div>
      {#if period}
        <p class="meta">
          {hhmm(period.time.start)}–{hhmm(period.time.end)} ·
          {state.settings.region}: {period.regions[state.settings.region]}
        </p>
      {/if}
    {/if}
  </div>
</Panel>
