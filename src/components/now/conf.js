/* Conf export/import for the now board.

   The saved settings (area, region, stops, proxy) live device-bound in
   localStorage. Export/import moves them between devices as strict JSON
   (versioned, so future format changes can migrate). Anything ambiguous
   is rejected loudly by validateConf, never guessed at — one funnel,
   every problem reported in one pass. The exact error strings are part
   of the UI contract (tests pin them). */

export const REGIONS = ["central", "east", "north", "south", "west"];
const ALLOWED_KEYS = ["version", "area", "region", "stops", "proxy"];
const ALLOWED_STOP_KEYS = ["code", "services"];

/**
 * @typedef {Object} LocalConf
 * @property {1} version
 * @property {string} area
 * @property {string} region
 * @property {{ code: string, services: string[] }[]} stops
 * @property {string} proxy
 */
/**
 * @typedef {({ ok: true, conf: LocalConf } | { ok: false, errors: string[] })} ConfResult
 */

/**
 * @param {{ area: string, region: string, stops: Array<{ code: string, services?: string[] }>, proxy?: string }} settings
 * @returns {LocalConf}
 */
export function serializeConf(settings) {
  return {
    version: 1,
    area: settings.area,
    region: settings.region,
    stops: settings.stops.map(function (s) {
      return { code: s.code, services: (s.services || []).slice() };
    }),
    proxy: settings.proxy || "",
  };
}

/**
 * @param {string} text
 * @returns {ConfResult}
 */
export function parseConfText(text) {
  const trimmed = String(text).trim();
  if (!trimmed) return { ok: false, errors: ["conf box is empty"] };
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    return {
      ok: false,
      errors: ["not valid JSON: " + (e && e.message ? e.message : e)],
    };
  }
  return validateConf(parsed);
}

/**
 * @param {unknown} raw
 * @returns {ConfResult}
 */
export function validateConf(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["conf must be an object"] };
  }
  Object.keys(raw).forEach(function (k) {
    if (ALLOWED_KEYS.indexOf(k) === -1) errors.push("unknown key: " + k);
  });
  if (raw.version !== 1) {
    errors.push("version must be 1");
  }
  if (typeof raw.area !== "string") errors.push("area must be a string");
  if (typeof raw.region !== "string" || REGIONS.indexOf(raw.region) === -1) {
    errors.push("region must be one of central/east/north/south/west");
  }
  if (typeof raw.proxy !== "string") {
    errors.push("proxy must be a string");
  } else if (raw.proxy !== "" && !/^https?:\/\//.test(raw.proxy)) {
    errors.push('proxy must start with http:// or https:// or be ""');
  }
  const stops = [];
  if (!Array.isArray(raw.stops)) {
    errors.push("stops must be a list");
  } else {
    raw.stops.forEach(function (s, i) {
      if (!s || typeof s !== "object" || Array.isArray(s)) {
        errors.push("stop #" + (i + 1) + " must be a mapping");
        return;
      }
      Object.keys(s).forEach(function (k) {
        if (ALLOWED_STOP_KEYS.indexOf(k) === -1)
          errors.push("stop #" + (i + 1) + ": unknown key " + k);
      });
      const code = String(s.code == null ? "" : s.code).trim();
      if (!/^\d{4,5}$/.test(code)) {
        errors.push(
          "stop #" + (i + 1) + ": code must be 4-5 digits (got " + code + ")",
        );
      }
      const services = [];
      if (s.services != null) {
        if (Array.isArray(s.services)) {
          s.services.forEach(function (sv) {
            services.push(String(sv).trim());
          });
        } else {
          errors.push("stop #" + (i + 1) + ": services must be a list");
        }
      }
      stops.push({ code: code, services: services });
    });
  }
  if (errors.length) return { ok: false, errors: errors };
  return {
    ok: true,
    conf: {
      version: 1,
      area: (raw.area || "").trim(),
      region: raw.region,
      stops: stops,
      proxy: (raw.proxy || "").trim(),
    },
  };
}
