/* Feed contract for the now board: data.gov.sg environment API (no key,
   CORS *). Payload shapes verified 2026-11-10 — see the plan doc, and the
   interfaces below encode them. The endpoint spelling here is
   load-bearing: a 2026-11-10 session change flipped 24-hour-forecast to
   24-hour-weather-forecast and the 403 that followed took a while to
   trace. Tests pin these exact URLs. */

export const API = "https://api.data.gov.sg/v1/environment";

/* ── payload shapes (optional everywhere the renderers guard) ────────── */

export interface TwoHourPayload {
  items: {
    valid_period?: { start?: string; end?: string };
    forecasts?: { area: string; forecast: string }[];
  }[];
}

export interface TwentyFourPayload {
  items: {
    general?: {
      forecast?: string;
      temperature?: { low: number; high: number };
      relative_humidity?: { low: number; high: number };
      wind?: {
        direction?: string;
        speed?: { low: number; high: number };
      };
    };
    periods?: {
      time: { start: string; end: string };
      regions?: Record<string, string>;
    }[];
  }[];
}

export interface FourDayPayload {
  items: {
    forecasts?: {
      date: string;
      forecast?: string;
      temperature?: { low: number; high: number };
    }[];
  }[];
}

export interface PsiPayload {
  items: {
    readings?: {
      psi_twenty_four_hourly?: Partial<
        Record<"central" | "east" | "north" | "south" | "west", number>
      >;
    };
  }[];
}

export interface Pm25Payload {
  items: {
    readings?: {
      pm25_one_hourly?: Partial<
        Record<"central" | "east" | "north" | "south" | "west", number>
      >;
    };
  }[];
}

/* LTA BusArrivalv2, served by the key-holding Vercel proxy (api/bus.js)
   with its Stop enrichment (Description · RoadName). NextBus2/3 arrive
   blank late at night — every iteration is optional. */
export interface BusArrivalPayload {
  Stop?: { BusStopCode?: string; Name?: string };
  Services?: {
    ServiceNo: string;
    NextBus?: { EstimatedArrival?: string };
    NextBus2?: { EstimatedArrival?: string };
    NextBus3?: { EstimatedArrival?: string };
  }[];
}

/* The distinct feed payloads, keyed exactly as the store and FEED_URLS —
   one source of truth for both. */
export interface FeedPayloads {
  w2h: TwoHourPayload;
  w24: TwentyFourPayload;
  w4: FourDayPayload;
  aqiPsi: PsiPayload;
  aqiPm: Pm25Payload;
}

export const FEED_URLS: Record<keyof FeedPayloads, string> = {
  w2h: API + "/2-hour-weather-forecast",
  w24: API + "/24-hour-weather-forecast",
  w4: API + "/4-day-weather-forecast",
  aqiPsi: API + "/psi",
  aqiPm: API + "/pm25",
};

export const REFRESH_MS = 5 * 60 * 1000;
export const BUS_FETCH_MS = 60 * 1000;

export type FeedKey = keyof FeedPayloads;

export function fetchJson<T = unknown>(
  url: string,
  timeoutMs?: number,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(function () {
    ctrl.abort();
  }, timeoutMs || 12000);
  return fetch(url, { signal: ctrl.signal }).then(
    function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json() as Promise<T>;
    },
    function (e: unknown) {
      clearTimeout(timer);
      throw e && (e as { name?: string }).name === "AbortError"
        ? new Error("timed out")
        : e;
    },
  );
}
