/* Feed contract for the now board: data.gov.sg environment API (no key,
   CORS *). Payload shapes verified 2026-11-10 — see the plan doc. The
   endpoint spelling here is load-bearing: a 2026-11-10 session change
   flipped 24-hour-forecast to 24-hour-weather-forecast and the 403 that
   followed took a while to trace. Tests pin these exact URLs. */

export const API = "https://api.data.gov.sg/v1/environment";

export const FEED_URLS = {
  w2h: API + "/2-hour-weather-forecast",
  w24: API + "/24-hour-weather-forecast",
  w4: API + "/4-day-weather-forecast",
  aqiPsi: API + "/psi",
  aqiPm: API + "/pm25",
};

export const REFRESH_MS = 5 * 60 * 1000;
export const BUS_FETCH_MS = 60 * 1000;

export function fetchJson(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () {
    ctrl.abort();
  }, timeoutMs || 12000);
  return fetch(url, { signal: ctrl.signal }).then(
    function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    },
    function (e) {
      clearTimeout(timer);
      throw e && e.name === "AbortError" ? new Error("timed out") : e;
    },
  );
}
