<script>
  import { onMount } from "svelte";
  import AirPanel from "./AirPanel.svelte";
  import BusPanel from "./BusPanel.svelte";
  import OutlookPanel from "./OutlookPanel.svelte";
  import SettingsDrawer from "./SettingsDrawer.svelte";
  import TodayPanel from "./TodayPanel.svelte";
  import VerdictPanel from "./VerdictPanel.svelte";
  import { REFRESH_MS } from "./feeds.js";
  import { hhmm } from "./formatters.js";
  import {
    busesDue,
    createNowState,
    fetchBuses,
    loadSaved,
    refresh,
  } from "./state.svelte.js";

  /* The now board island: one reactive state object owned here, created by
     the state factory and passed to every panel as a single prop. All
     mutations live in state.svelte.js; this component owns the clock
     (30s tick for ages/countdowns, 5-min feed refresh, 1-min visible bus
     polls) and the masthead. */

  /* the page mounts without props; tests inject their own state so they can
     drive mutations directly — same reactive object either way */
  let { state: board = createNowState() } = $props();
  let refreshing = $state(false);

  function doRefresh() {
    refreshing = true;
    return refresh(board).then(function () {
      refreshing = false;
    });
  }

  let dateline = $derived.by(() => {
    board.tick; /* the clock re-derives on the island tick */
    const now = new Date();
    return (
      now.toLocaleDateString([], {
        weekday: "long",
        day: "numeric",
        month: "long",
      }) +
      " · " +
      now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  });

  let global = $derived.by(() => {
    board.tick;
    if (refreshing) return { text: "checking…", cls: "status" };
    const ok = Object.keys(board.errs).length === 0;
    return {
      text:
        "last check " +
        hhmm(new Date(board.lastFetch || 0).toISOString()) +
        (ok ? " · all feeds ok" : " · some feeds failing"),
      cls: ok ? "status" : "status err",
    };
  });

  onMount(function () {
    /* localStorage is client-only; the SSR pass renders silent defaults
       and client:load takes over immediately after. */
    loadSaved(board);
    doRefresh();
    const iv = setInterval(function () {
      board.tick += 1; /* ages and countdowns re-derive */
      if (Date.now() - board.lastFetch >= REFRESH_MS) doRefresh();
      if (busesDue(board)) fetchBuses(board);
    }, 30000);
    function onVis() {
      if (busesDue(board)) fetchBuses(board);
      if (
        document.visibilityState === "visible" &&
        Date.now() - board.lastFetch >= REFRESH_MS
      )
        doRefresh();
    }
    document.addEventListener("visibilitychange", onVis);
    return function () {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  });
</script>

<div class="now-board">
  <header class="masthead">
    <h1>now</h1>
    <p class="dateline" id="dateline">{dateline}</p>
    <button class="btn" id="refresh" type="button" onclick={doRefresh}>
      Refresh
    </button>
    <p class={global.cls} id="global" role="status" aria-live="polite">
      {global.text}
    </p>
  </header>

  <main>
    <VerdictPanel state={board} />
    <BusPanel state={board} />
    <AirPanel state={board} />
    <TodayPanel state={board} />
    <OutlookPanel state={board} />
    <SettingsDrawer state={board} />
  </main>

  <footer id="footline">
    data: NEA / data.gov.sg · fetched in-browser · cached locally
  </footer>
</div>

<style>
  .now-board {
    font-family: "Space Grotesk Variable", system-ui, sans-serif;
    font-size: 16px;
    line-height: 1.55;
    color: var(--fg);
    max-width: 38rem;
    margin-inline: auto;
    padding-block: max(1.4rem, env(safe-area-inset-top)) 3rem;
  }

  header.masthead h1 {
    font-size: 1.35rem;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--deep);
    margin: 0 0 0.15rem;
  }

  header.masthead .dateline {
    font-family: "Space Mono", monospace;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 0.9rem;
  }

  footer#footline {
    margin-block-start: 2.4rem;
    font-family: "Space Mono", monospace;
    font-size: 0.68rem;
    letter-spacing: 0.05em;
    color: var(--muted);
  }
</style>
