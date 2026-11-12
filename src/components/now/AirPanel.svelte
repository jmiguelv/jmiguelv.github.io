<script>
  import Panel from "./Panel.svelte";
  import { pm25Band, pm25Dot, psiBand, psiDot } from "./formatters.js";

  /* Air / haze: PSI 24h per region (5 regions, no national reading) plus
     PM2.5 1-hourly — two feeds degrading independently: a PM2.5 failure
     becomes "PM2.5(1h) —" plus a status-line note, never a broken panel.
     Dots always carry a band name in text too — colour is never the only
     carrier. */
  let { state } = $props();

  let psiRead = $derived(state.store.aqiPsi?.d?.items?.[0]?.readings ?? null);
  let region = $derived(state.settings.region);
  let psi = $derived(psiRead?.psi_twenty_four_hourly?.[region] ?? null);
  let pm1 = $derived(
    state.store.aqiPm?.d?.items?.[0]?.readings?.pm25_one_hourly?.[region] ??
      null,
  );
  const names = ["central", "east", "north", "south", "west"];
  let strip = $derived(
    names
      .map(function (n) {
        const v = psiRead?.psi_twenty_four_hourly?.[n] ?? null;
        return n + " " + (v == null ? "—" : v);
      })
      .join(" · "),
  );
  let pmDown = $derived(Boolean(state.errs.aqiPm));
</script>

<Panel
  heading="air / haze"
  panel="aqiPsi"
  statusLabel="psi fetched"
  statusId="air-status"
  statusExtra={() => (pmDown ? " · pm2.5 unavailable" : "")}
  {state}
>
  {#if !psiRead}
    <div id="air">
      <p class="empty">{state.errs.aqiPsi ? "PSI unavailable." : "Loading…"}</p>
    </div>
  {:else}
    <div id="air">
      <p class="lead">
        <span class="dot {psiDot(psi == null ? 999 : psi)}" aria-hidden="true"
        ></span>
        {region} PSI(24h) {psi == null ? "—" : psi + " · " + psiBand(psi)}
      </p>
      {#if pm1 != null}
        <p class="lead">
          <span class="dot {pm25Dot(pm1)}" aria-hidden="true"></span>
          PM2.5(1h) {pm1} · {pm25Band(pm1)}
        </p>
      {:else}
        <p class="lead">PM2.5(1h) —</p>
      {/if}
      <p class="meta">{strip}</p>
    </div>
  {/if}
</Panel>

<style>
  .lead {
    margin-block: 0 1.05rem;
  }

  .dot {
    display: inline-block;
    width: 0.62em;
    height: 0.62em;
    border-radius: 50%;
    margin-right: 0.3em;
    vertical-align: baseline;
    background: var(--rule);
  }

  .dot.g {
    background: var(--aqi-good);
  }

  .dot.e {
    background: var(--aqi-elev);
  }

  .dot.h {
    background: var(--aqi-high);
  }
</style>
