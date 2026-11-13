/* LTA DataMall bus-arrival proxy — Vercel serverless function.
 *
 * Zero-config mount: root api/ directory → https://<deployment>.vercel.app/api/bus
 * (the GitHub Pages workflow ignores this directory entirely).
 *
 * The key is a Vercel env var, never in the repo or the browser:
 *
 *   vercel env add LTA_ACCOUNT_KEY production   # paste the DataMall key
 *   vercel --prod
 *
 * Local development:
 *   npx vercel link && npx vercel env add LTA_ACCOUNT_KEY development
 *   npx vercel dev   → function at http://localhost:3000/api/bus
 *   (env pull writes .env.local — gitignored)
 *
 * Then paste https://<your-project>.vercel.app/api/bus into the
 * "bus proxy url" field at /lab/now/.
 *
 * LTA DataMall sends no CORS headers, so the browser can never call it
 * directly — a key-holding proxy is mandatory either way.
 */

/* LTA DataMall BusArrival **v3** — from the official API User Guide v6.11
 * (30 Oct 2026, datamall.lta.gov.sg → LTA_DataMall_API_User_Guide.pdf):
 *   GET https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival
 *       ?BusStopCode=<5 digits>[&ServiceNo=<svc>]
 * Auth: AccountKey request header. The Akamai edge hides the route from
 * keyless requests (HTTP is blanket-denied; HTTPS without AccountKey
 * returns 404 "API not found", with the header it returns 401/200).
 * Verified 2026-11-11: bogus AccountKey → 401, confirming routing.
 */
const LTA_URL =
  "https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival";
/* Section 2.4 of the User Guide v6.11: no /v3/ prefix on BusStops. Records:
   BusStopCode, RoadName, Description (landmark), Latitude, Longitude. */
const STOPS_URL = "https://datamall2.mytransport.sg/ltaodataservice/BusStops";

/* code -> "<Description> · <RoadName>", rebuilt at most once a day per warm
   instance. Names are a nicety: if this walk fails, arrivals still flow.
   Caps: the loop ends when a page comes back short or repeats (a server
   that ignores $skip can never trip us into an infinite walk). */
const STOP_NAMES_TTL_MS = 24 * 60 * 60 * 1000;
let stopNames = null; /* { expires, map } at module scope of warm instances */

async function getStopNames(accountKey) {
  if (stopNames && Date.now() < stopNames.expires) return stopNames.map;
  const map = {};
  let skip = 0;
  try {
    let prevFirst = null; /* first code of the previous page — lets the
                            walk detect a server that ignores $skip */
    for (let page = 0; page < 60; page++) {
      const r = await fetch(STOPS_URL + "?$skip=" + skip, {
        headers: { AccountKey: accountKey, Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) throw new Error("BusStops HTTP " + r.status);
      const body = await r.json();
      if (!Array.isArray(body.value)) {
        throw new Error("unexpected BusStops shape");
      }
      if (body.value.length === 0) break;
      const firstCode = body.value[0].BusStopCode;
      if (firstCode === prevFirst) {
        /* the server ignored $skip — the same first record again */
        break;
      }
      prevFirst = firstCode;
      body.value.forEach(function (s) {
        const name = [s.Description, s.RoadName].filter(Boolean).join(" · ");
        map[s.BusStopCode] = name || null;
      });
      if (body.value.length < 500) break;
      skip += body.value.length;
    }
    stopNames = { expires: Date.now() + STOP_NAMES_TTL_MS, map: map };
    return map;
  } catch (e) {
    console.warn("BusStops fetch failed — continuing without names", e);
    return null;
  }
}
const DEFAULT_ORIGINS = [
  "https://jmiguelv.github.io",
  "http://localhost:4321",
  "http://localhost:4327",
];

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = (
    process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : DEFAULT_ORIGINS
  )
    .map((s) => s.trim())
    .includes(origin);

  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") return res.status(204).end();
  if (!allowed) return res.status(403).json({ error: "origin not allowed" });

  /* Cheap, deployment-independent validation before config checks. */
  const stop = (req.query.BusStopCode || "").trim();
  if (!/^\d{4,5}$/.test(stop)) {
    return res.status(400).json({ error: "BusStopCode must be 4–5 digits" });
  }

  if (!process.env.LTA_ACCOUNT_KEY) {
    /* Fail loudly instead of letting a missing key get blamed on LTA. */
    return res
      .status(500)
      .json({ error: "LTA_ACCOUNT_KEY is not set on this deployment" });
  }

  let upstream;
  try {
    /* Hard timeout: a tarpitted upstream must fail visibly, never hang
       the caller (this was observed against LTA's Akamai edge). */
    upstream = await fetch(LTA_URL + "?BusStopCode=" + stop, {
      headers: {
        AccountKey: process.env.LTA_ACCOUNT_KEY,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    return res.status(504).json({
      error: "upstream fetch failed",
      detail: e && e.message ? e.message : String(e),
    });
  }

  const upstreamText = await upstream.text();
  if (upstream.status !== 200) {
    /* relay failures untouched — the LTA body is the error message */
    return res
      .status(upstream.status)
      .setHeader(
        "Content-Type",
        upstream.headers.get("content-type") || "application/json",
      )
      .send(upstreamText);
  }

  /* Enrich the 200 with the human-readable stop name when we know it.
     Fail-soft: an enrichment error must not break arrivals. */
  try {
    const payload = JSON.parse(upstreamText);
    const names = await getStopNames(process.env.LTA_ACCOUNT_KEY);
    if (names) {
      payload.Stop = { BusStopCode: stop, Name: names[stop] || null };
    }
    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .send(JSON.stringify(payload));
  } catch (e) {
    console.warn("stop-name enrichment failed — relaying raw payload", e);
    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .send(upstreamText);
  }
}
