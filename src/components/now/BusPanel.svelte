<script>
  import Panel from "./Panel.svelte";
  import { ago, minsTo } from "./formatters.js";

  /* Buses: arrivals for the saved stops through the user's proxy. Cards
     derive from the cache — countdowns re-derive on the 30s tick, no
     render-time requests. Fetches happen in state.svelte.js (poll at most
     once a minute while visible: LTA quota). Unlike feed panels, the
     status line here is not fetch-driven: it reports what is saved on
     this device, so this panel owns it directly. */
  let { state } = $props();

  let stops = $derived(state.settings.stops);
  let proxy = $derived(state.settings.proxy);

  function timesFor(svc) {
    state.tick; /* countdowns re-derive on the island clock */
    return ["NextBus", "NextBus2", "NextBus3"]
      .map(function (k) {
        return svc[k] && svc[k].EstimatedArrival
          ? minsTo(svc[k].EstimatedArrival)
          : null;
      })
      .filter(Boolean);
  }
</script>

<Panel heading="buses" {state}>
  <div id="buses">
    {#if !stops.length}
      <p class="empty">No stops saved yet — add your bus stop in settings.</p>
    {:else}
      {#each stops as stop (stop.code)}
        {@const cached = state.busCache[stop.code]}
        {@const err = state.errs["bus:" + stop.code]}
        {@const stopName = cached?.d?.Stop?.Name}
        <div class="stop">
          <h3>
            {stopName ? stop.code + " · " + stopName : "Stop " + stop.code}
          </h3>
          <p class="svcs">
            {stop.services && stop.services.length
              ? "services: " + stop.services.join(", ")
              : "all services"}
          </p>
          {#if !proxy}
            <p class="empty">
              Arrivals come through your proxy URL — set it in settings. Your
              stop is saved.
            </p>
          {:else if err && !cached}
            <p class="empty">Arrivals unavailable: {err}</p>
          {:else if !cached}
            <p class="empty">Loading arrivals…</p>
          {:else}
            {@const wanted =
              stop.services && stop.services.length ? stop.services : null}
            {@const shown = (cached.d.Services || []).filter(
              (svc) => !wanted || wanted.indexOf(svc.ServiceNo) !== -1,
            )}
            <ol>
              {#each shown as svc (svc.ServiceNo)}
                <li>
                  {svc.ServiceNo}:
                  <b>{timesFor(svc).join(", ") || "no buses yet"}</b>
                </li>
              {/each}
              {#if !shown.length}
                <li>no services matched</li>
              {/if}
            </ol>
            <p class="meta">
              arrivals fetched {ago(cached.at)}{err
                ? " · last retry failed"
                : ""}
            </p>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
  <p class="status" id="buses-status">
    {stops.length ? stops.length + " stop(s) saved on this device" : ""}
  </p>
</Panel>

<style>
  .stop {
    border: 2px solid var(--rule);
    border-radius: 12px;
    background: var(--panel);
    padding: 0.75rem 0.9rem;
    margin-block-end: 0.6rem;
  }

  .stop h3 {
    font-size: 0.95rem;
    font-weight: 500;
    margin: 0 0 0.3rem;
    color: var(--deep);
  }

  .stop .svcs {
    font-family: "Space Mono", monospace;
    font-size: 0.72rem;
    color: var(--muted);
    margin: 0 0 0.5rem;
  }

  .stop ol {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
  }

  .stop ol li {
    font-family: "Space Mono", monospace;
    font-size: 0.85rem;
    color: var(--fg);
  }

  .stop ol li b {
    color: var(--deep);
  }
</style>
