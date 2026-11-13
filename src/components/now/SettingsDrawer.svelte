<script lang="ts">
  import {
    addStop,
    applyConf,
    fetchBuses,
    persist,
    removeStop,
    setProxy,
    wipe,
  } from "./state.svelte";
  import { parseConfText, serializeConf } from "./conf";

  /* The settings drawer owns every input the board persists: area, region,
     proxy URL, stop codes, and the versioned JSON conf. Everything funnels
     through the state module and the conf validators — nothing is guessed
     at, and every error surfaces here. */

  let { state: board }: { state: NowState } = $props();

  /* Area options derive from the cached 2-hour forecast (the authority on
     the valid names) — the old manual fill-once memo becomes a plain
     derivation that stays correct by construction. */
  let areas = $derived(
    board.store.w2h?.d?.items?.[0]?.forecasts?.map((f) => f.area) ?? [],
  );

  let code = $state("");
  let services = $state("");
  let confText = $state("");
  let confStatus = $state("");
  let confErr = $state(false);
  let proxyMsg = $state("");
  let armed = $state(false);
  let armTimer = 0;

  function onArea(
    ev: Event & { currentTarget: EventTarget & HTMLSelectElement },
  ) {
    board.settings.area = ev.currentTarget.value;
    persist(board);
  }
  function onRegion(
    ev: Event & { currentTarget: EventTarget & HTMLSelectElement },
  ) {
    board.settings.region = ev.currentTarget.value;
    persist(board);
  }
  function onProxy(
    ev: Event & { currentTarget: EventTarget & HTMLInputElement },
  ) {
    proxyMsg = setProxy(board, ev.currentTarget.value);
  }

  function onAddStop(
    ev: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement },
  ) {
    ev.preventDefault();
    const digits = code.replace(/\D/g, "");
    if (!/^\d{4,5}$/.test(digits)) {
      proxyMsg = "Stop code must be 4–5 digits";
      return;
    }
    const svcs = services.split(/[,;\s]+/).filter(Boolean);
    const dup = addStop(board, digits, svcs);
    if (dup) {
      proxyMsg = dup;
      return;
    }
    proxyMsg = "";
    code = "";
    services = "";
    /* fetch immediately: a stop added after mount must not wait for the
       30s tick to catch the 60s throttle before its first arrivals (and
       the proxy-provided stop name) arrive */
    fetchBuses(board);
  }

  function onExport() {
    const text = JSON.stringify(serializeConf(board.settings), null, 2);
    confText = text;
    try {
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "now.settings.json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(url);
        a.remove();
      }, 1000);
    } catch (e) {
      console.warn("download unavailable — the box still holds the conf", e);
    }
    confStatus = "exported — downloaded, and in the box to copy";
    confErr = false;
  }

  function onImport() {
    const res = parseConfText(confText);
    if (!res.ok) {
      confStatus = res.errors.join(" · ");
      confErr = true;
      return;
    }
    applyConf(board, res.conf);
    confText = "";
    confStatus =
      "imported: " +
      res.conf.stops.length +
      " stop(s), area " +
      (res.conf.area || "—");
    confErr = false;
  }

  function onImportFile(
    ev: Event & { currentTarget: EventTarget & HTMLInputElement },
  ) {
    const file = ev.currentTarget.files && ev.currentTarget.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      confText = String(reader.result);
      onImport();
    };
    reader.onerror = function () {
      confStatus =
        "could not read file: " +
        (reader.error && reader.error.message ? reader.error.message : "?");
      confErr = true;
    };
    reader.readAsText(file);
  }

  function onWipe() {
    if (!armed) {
      armed = true;
      clearTimeout(armTimer);
      armTimer = setTimeout(function () {
        armed = false;
      }, 3000);
      return;
    }
    clearTimeout(armTimer);
    armed = false;
    wipe(board);
  }
</script>

<details class="settings" id="settings">
  <summary>settings</summary>
  <div class="field">
    <label for="setq-area">weather area</label>
    <select id="setq-area" value={board.settings.area} onchange={onArea}>
      <option value="">Select area…</option>
      {#each areas as a (a)}
        <option value={a}>{a}</option>
      {/each}
    </select>
  </div>
  <div class="field">
    <label for="setq-region">psi + 24h region</label>
    <select id="setq-region" value={board.settings.region} onchange={onRegion}>
      {#each ["central", "east", "north", "south", "west"] as r (r)}
        <option value={r}>{r}</option>
      {/each}
    </select>
  </div>
  <div class="field">
    <label for="setq-proxy">bus proxy url</label>
    <input
      id="setq-proxy"
      type="url"
      autocomplete="off"
      spellcheck="false"
      placeholder="https://your-bus-proxy.example"
      value={board.settings.proxy}
      onchange={onProxy}
    />
  </div>
  <form id="stopform" onsubmit={onAddStop}>
    <input
      id="stop-code"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      placeholder="Bus stop code, e.g. 17009"
      bind:value={code}
    />
    <input
      id="stop-services"
      type="text"
      autocomplete="off"
      placeholder="Services, e.g. 96, 197 — optional"
      bind:value={services}
    />
    <button class="btn" type="submit">Add stop</button>
  </form>
  {#if proxyMsg}
    <p class="status err">{proxyMsg}</p>
  {/if}
  <textarea
    id="conf-box"
    rows="8"
    spellcheck="false"
    aria-label="config export/import"
    bind:value={confText}></textarea>
  <div class="field">
    <button class="btn" id="conf-export" type="button" onclick={onExport}>
      Export
    </button>
    <button class="btn" id="conf-import" type="button" onclick={onImport}>
      Import
    </button>
    <input
      id="conf-file"
      type="file"
      accept=".json,.txt"
      aria-label="Load config file"
      onchange={onImportFile}
    />
  </div>
  {#if confStatus}
    <p class={"status " + (confErr ? "err" : "")} id="conf-status">
      {confStatus}
    </p>
  {/if}
  <ul id="stops-list">
    {#each board.settings.stops as stop, i (stop.code)}
      <li>
        <span>
          {[
            stop.code,
            board.stopNames[stop.code] || "",
            stop.services && stop.services.length
              ? stop.services.join(", ")
              : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <button class="rm" type="button" onclick={() => removeStop(board, i)}
          >remove</button
        >
      </li>
    {/each}
  </ul>
  <button class="btn danger" id="wipe" type="button" onclick={onWipe}>
    {armed ? "Tap again to clear everything" : "Clear saved data"}
  </button>
  <p class="hint">
    Area, region, stops and the proxy URL are saved in this browser only.
    Export/import moves the conf between devices. The LTA key lives on the
    proxy, never in this page.
  </p>
</details>
