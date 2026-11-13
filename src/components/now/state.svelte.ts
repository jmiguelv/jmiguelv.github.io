/* The now board's reactive state, as one $state object created by a
   factory — the island components receive it as a single prop and render
   via Svelte's runes everywhere; this module owns all the mutations
   (loading, fetching, applying conf, wiping) as plain functions so the
   logic is testable without any component mounted.

   Keys are read from/written to localStorage (device-bound; nothing
   personal lives in the repo). Guards handle SSR (static prerender) and
   jsdom tests: on the server there is no localStorage and no reason to
   fetch. */

import { FEED_URLS, fetchJson } from "./feeds";
import type { BusArrivalPayload, FeedPayloads } from "./feeds";
import type { Conf } from "./conf";

export const LS_SETTINGS = "now.settings.v1";
export const LS_CACHE = "now.cache.v1";

export interface StopConf {
  code: string;
  services: string[];
}

export interface NowSettings {
  area: string;
  region: string;
  stops: StopConf[];
  proxy: string;
}

export interface NowState {
  settings: NowSettings;
  store: { [K in keyof FeedPayloads]?: { d: FeedPayloads[K]; at: number } };
  /* feed key or "bus:<code>" -> last failure message; cleared on the
     next success */
  errs: Record<string, string>;
  lastFetch: number;
  busLastFetch: number;
  /* stop code -> { d: LTA payload, at: ms } — written by fetchBuses */
  busCache: Record<string, { d: BusArrivalPayload; at: number }>;
  /* stop code -> human name, learned from the proxy's Stop enrichment */
  stopNames: Record<string, string>;
  /* bumped by the island's 30s clock; every age/countdown derivation
     reads it so minutes re-render the way the old renderAll tick did */
  tick: number;
}

const DEFAULT_SETTINGS: NowSettings = {
  area: "",
  region: "west",
  stops: [],
  proxy: "",
};

export function createNowState(): NowState {
  const s = $state<NowState>({
    settings: { ...DEFAULT_SETTINGS },
    store: {},
    errs: {},
    lastFetch: 0,
    busLastFetch: 0,
    busCache: {},
    stopNames: {},
    tick: 0,
  });
  return s;
}

/* Storage lands somewhere different on every runtime: browsers have the
   real global; this repo's test runner runs a Node whose experimental,
   unconfigured `localStorage` global shadows vitest's jsdom population,
   so there the only working instance is `window.localStorage`. SSR has
   neither — the callers guard. */
function storage(): Storage | null {
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
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

function lsGet<T>(key: string, fallback: T): T {
  const ls = storage();
  if (!ls) return fallback;
  try {
    const raw = ls.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (e: unknown) {
    console.warn("localStorage read failed", key, e);
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(key, JSON.stringify(value));
  } catch (e: unknown) {
    console.warn("localStorage write failed", key, e);
  }
}

export function loadSaved(state: NowState) {
  const saved = lsGet<Partial<NowSettings>>(LS_SETTINGS, {});
  state.settings = { ...DEFAULT_SETTINGS, ...saved };
  /* legacy junk in the shape saved by earlier versions would break the
     render derivations — validate the pieces we keep */
  if (!Array.isArray(state.settings.stops)) state.settings.stops = [];
  if (typeof state.settings.region !== "string") state.settings.region = "west";
  if (typeof state.settings.area !== "string") state.settings.area = "";
  if (typeof state.settings.proxy !== "string") state.settings.proxy = "";
  state.store = lsGet<NowState["store"]>(LS_CACHE, {});
}

export function persist(state: NowState) {
  lsSet(LS_SETTINGS, state.settings);
  lsSet(LS_CACHE, state.store);
}

function grab<K extends keyof FeedPayloads>(
  state: NowState,
  panel: K,
  url: string,
) {
  return fetchJson<FeedPayloads[K]>(url).then(
    function (d: FeedPayloads[K]) {
      /* TS cannot prove a write through a generic key matches the member
         type — the generic fetchJson above checks exactly that by
         construction, hence the narrow cast on the value. */
      state.store[panel] = {
        d: d,
        at: Date.now(),
      } as (typeof state.store)[K];
      delete state.errs[panel];
    },
    function (e: unknown) {
      state.errs[panel] = e instanceof Error ? e.message : String(e);
      console.warn(String(panel) + " fetch failed", e);
    },
  );
}

export function refresh(state: NowState) {
  state.lastFetch = Date.now();
  fetchBuses(state); /* parity with the original controller: every refresh
                                 also turns the bus wheel when a proxy is configured */
  return Promise.all(
    (Object.keys(FEED_URLS) as (keyof FeedPayloads)[]).map(function (
      panel: keyof FeedPayloads,
    ) {
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
export function fetchBuses(state: NowState) {
  const { proxy, stops } = state.settings;
  if (!proxy || !stops.length) return;
  state.busLastFetch = Date.now();
  stops.forEach(function (stop: StopConf) {
    fetchJson<BusArrivalPayload>(
      proxy + "?BusStopCode=" + encodeURIComponent(stop.code),
    ).then(
      function (d) {
        state.busCache[stop.code] = { d: d, at: Date.now() };
        if (d && d.Stop && d.Stop.Name)
          state.stopNames[stop.code] = d.Stop.Name;
        delete state.errs["bus:" + stop.code];
      },
      function (e: unknown) {
        state.errs["bus:" + stop.code] =
          e instanceof Error ? e.message : String(e);
        console.warn("bus:" + stop.code + " fetch failed", e);
      },
    );
  });
}

export function busesDue(state: NowState): boolean {
  return (
    Boolean(state.settings.proxy) &&
    state.settings.stops.length > 0 &&
    (typeof document === "undefined" ||
      document.visibilityState === "visible") &&
    Date.now() - state.busLastFetch >= BUS_FETCH_MS_VAL
  );
}
const BUS_FETCH_MS_VAL = 60 * 1000;

export function applyConf(state: NowState, conf: Conf) {
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

export function wipe(state: NowState) {
  const ls = storage();
  if (ls) {
    try {
      ls.removeItem(LS_SETTINGS);
      ls.removeItem(LS_CACHE);
    } catch (e: unknown) {
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

export function addStop(
  state: NowState,
  code: string,
  services: string[],
): string {
  if (
    state.settings.stops.some(function (s: StopConf) {
      return s.code === code;
    })
  )
    return "Stop " + code + " is already saved";
  state.settings.stops.push({ code: code, services: services });
  persist(state);
  return "";
}

export function removeStop(state: NowState, i: number) {
  state.settings.stops.splice(i, 1);
  persist(state);
}

export function setProxy(state: NowState, value: string): string {
  const v = String(value || "").trim();
  if (v && !/^https?:\/\//.test(v)) {
    return "Proxy URL must start with http:// or https://";
  }
  state.settings.proxy = v;
  persist(state);
  fetchBuses(state);
  return "";
}
