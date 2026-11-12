<script>
  import Panel from "./Panel.svelte";
  import { hhmm } from "./formatters.js";

  /* Today: the 24-hour forecast — general summary, chips, and the weather
     period currently in force for the chosen region. The period check
     reads the island clock, so the row rolls over on the 30s tick rather
     than waiting for a fetch. */
  let { state } = $props();

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

<style>
  .summary {
    margin-block: 0 0.3rem;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.2rem;
    margin: 0.3rem 0 0;
  }

  .chip {
    font-family: "Space Mono", monospace;
    font-size: 0.78rem;
    color: var(--fg);
  }

  .chip b {
    color: var(--deep);
  }

  .chip small {
    display: block;
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--muted);
  }
</style>
