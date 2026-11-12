/* The now board's reactive state, as one $state object created by a
   factory — the island components receive it as a single prop and render
   via Svelte's runes everywhere; this module owns all the mutations
   (loading, fetching, applying conf, wiping) as plain functions so the
   logic is testable without any component mounted.

   Keys are read from/written to localStorage (device-bound; nothing
   personal lives in the repo). Guards handle SSR (static prerender) and
   jsdom tests: on the server there is no localStorage and no reason to
   fetch. */

import { FEED_URLS, fetchJson } from "./feeds.js";

export const LS_SETTINGS = "now.settings.v1";
export const LS_CACHE = "now.cache.v1";

const DEFAULT_SETTINGS = {
  area: "",
  region: "west",
  stops: [],
  proxy: "",
};

export function createNowState() {
  const s = $state({
    settings: { ...DEFAULT_SETTINGS },
    /* feed key ("w2h" | "w24" | "w4" | "aqiPsi") -> { d: payload, at: ms } */
    store: {},
    /* feed key or "bus:<code>" -> last failure message; cleared on the
       next success */
    errs: {},
    lastFetch: 0,
    busLastFetch: 0,
    /* stop code -> { d: LTA payload, at: ms } — written by fetchBuses */
    busCache: {},
    /* stop code -> human name, learned from the proxy's Stop enrichment */
    stopNames: {},
    /* bumped by the island's 30s clock; every age/countdown derivation
       reads it so minutes re-render the way the old renderAll tick did */
    tick: 0,
  });
  return s;
}

/* Storage lands somewhere different on every runtime: browsers have the
   real global; this repo's test runner runs a Node whose experimental,
   unconfigured `localStorage` global shadows vitest's jsdom population,
   so there the only working instance is `window.localStorage`. SSR has
   neither — the callers guard. */
function storage() {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem) {
      return localStorage;
    }
  } catch {
    /* Node's placeholder throws on access; window is the next stop */
  }
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    /* SSR: neither — fall through */
  }
  return null;
}

function lsGet(key, fallback) {
  const ls = storage();
  if (!ls) return fallback;
  try {
    const raw = ls.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn("localStorage read failed", key, e);
    return fallback;
  }
}

function lsSet(key, value) {
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("localStorage write failed", key, e);
  }
}

export function loadSaved(state) {
  state.settings = {
    ...DEFAULT_SETTINGS,
    ...lsGet(LS_SETTINGS, {}),
  };
  /* legacy junk in the shape saved by earlier versions would break the
     render derivations — validate the pieces we keep */
  if (!Array.isArray(state.settings.stops)) state.settings.stops = [];
  if (!REGIONS_OK.includes(state.settings.region))
    state.settings.region = "west";
  if (typeof state.settings.area !== "string") state.settings.area = "";
  if (typeof state.settings.proxy !== "string") state.settings.proxy = "";
  state.store = lsGet(LS_CACHE, {});
}

const REGIONS_OK = ["central", "east", "north", "south", "west"];

export function persist(state) {
  lsSet(LS_SETTINGS, state.settings);
  lsSet(LS_CACHE, state.store);
}

function grab(state, panel, url) {
  return fetchJson(url)
    .then(function (d) {
      state.store[panel] = { d: d, at: Date.now() };
      delete state.errs[panel];
    })
    .catch(function (e) {
      state.errs[panel] = e && e.message ? e.message : String(e);
      console.warn(panel + " fetch failed", e);
    });
}

export function refresh(state) {
  state.lastFetch = Date.now();
  fetchBuses(
    state,
  ); /* parity with the original controller: every refresh also	urns the bus wheel when a proxy is configured */
  return Promise.all(
    Object.keys(FEED_URLS).map(function (panel) {
      return grab(state, panel, FEED_URLS[panel]);
    }),
  ).then(function () {
    state.tick += 1;
    persist(state);
  });
}

/* Bus arrivals: LTA DataMall needs an AccountKey and sends no CORS
   headers, so the page calls a key-holding proxy whose URL the user
   pastes in settings. The key never reaches this page; the proxy lives
   at api/bus.js (Vercel serverless). */
export function fetchBuses(state) {
  const { proxy, stops } = state.settings;
  if (!proxy || !stops.length) return;
  state.busLastFetch = Date.now();
  stops.forEach(function (stop) {
    fetchJson(proxy + "?BusStopCode=" + encodeURIComponent(stop.code))
      .then(function (d) {
        state.busCache[stop.code] = { d: d, at: Date.now() };
        if (d && d.Stop && d.Stop.Name)
          state.stopNames[stop.code] = d.Stop.Name;
        delete state.errs["bus:" + stop.code];
      })
      .catch(function (e) {
        state.errs["bus:" + stop.code] = e && e.message ? e.message : String(e);
        console.warn("bus:" + stop.code + " fetch failed", e);
      });
  });
}

export function busesDue(state) {
  return (
    state.settings.proxy &&
    state.settings.stops.length &&
    (typeof document === "undefined" ||
      document.visibilityState === "visible") &&
    Date.now() - state.busLastFetch >= BUS_FETCH_MS_VAL
  );
}
const BUS_FETCH_MS_VAL = 60 * 1000;

export function applyConf(state, conf) {
  state.settings.area = conf.area;
  state.settings.region = conf.region;
  state.settings.stops = conf.stops;
  state.settings.proxy = conf.proxy;
  state.errs = {}; /* a fresh conf gets a clean slate for bus errors */
  state.busCache = {};
  state.busLastFetch = 0;
  persist(state);
  fetchBuses(state);
}

export function wipe(state) {
  const ls = storage();
  if (ls) {
    try {
      ls.removeItem(LS_SETTINGS);
      ls.removeItem(LS_CACHE);
    } catch (e) {
      console.warn(e);
    }
  }
  state.settings = { ...DEFAULT_SETTINGS };
  state.store = {};
  state.errs = {};
  state.busCache = {};
  state.stopNames = {};
  state.busLastFetch = 0;
  persist(state);
}

export function addStop(state, code, services) {
  if (
    state.settings.stops.some(function (s) {
      return s.code === code;
    })
  )
    return "Stop " + code + " is already saved";
  state.settings.stops.push({ code: code, services: services });
  persist(state);
  return "";
}

export function removeStop(state, i) {
  state.settings.stops.splice(i, 1);
  persist(state);
}

export function setProxy(state, value) {
  const v = String(value || "").trim();
  if (v && !/^https?:\/\//.test(v)) {
    return "Proxy URL must start with http:// or https://";
  }
  state.settings.proxy = v;
  persist(state);
  fetchBuses(state);
  return "";
}
