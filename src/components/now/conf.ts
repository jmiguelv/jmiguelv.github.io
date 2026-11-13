/* Conf export/import for the now board.

   The saved settings (area, region, stops, proxy) live device-bound in
   localStorage. Export/import moves them between devices as strict JSON
   (versioned, so future format changes can migrate). Anything ambiguous
   is rejected loudly by validateConf, never guessed at — one funnel,
   every problem reported in one pass. The exact error strings are part of
   the UI contract (tests pin them). */

export const REGIONS = ["central", "east", "north", "south", "west"] as const;
export type Region = (typeof REGIONS)[number];

const ALLOWED_KEYS = ["version", "area", "region", "stops", "proxy"];
const ALLOWED_STOP_KEYS = ["code", "services"];

export interface StopConf {
  code: string;
  services: string[];
}

export interface Conf {
  version: 1;
  area: string;
  region: Region;
  stops: StopConf[];
  proxy: string;
}

export type ConfResult =
  | { ok: true; conf: Conf }
  | { ok: false; errors: string[] };

export interface ConfSettingsShape {
  area: string;
  region: string;
  stops: { code: string; services?: string[] }[];
  proxy?: string;
}

export function serializeConf(settings: ConfSettingsShape): Conf {
  return {
    version: 1,
    area: settings.area,
    region: settings.region as Region,
    stops: settings.stops.map(function (s): StopConf {
      return { code: s.code, services: (s.services || []).slice() };
    }),
    proxy: settings.proxy || "",
  };
}

export function parseConfText(text: string): ConfResult {
  const trimmed = String(text).trim();
  if (!trimmed) return { ok: false, errors: ["conf box is empty"] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e: unknown) {
    return {
      ok: false,
      errors: [
        "not valid JSON: " +
          (e instanceof Error ? e.message : String(e as object)),
      ],
    };
  }
  return validateConf(parsed);
}

export function validateConf(raw: unknown): ConfResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["conf must be an object"] };
  }
  const obj = raw as Record<string, unknown>;
  Object.keys(obj).forEach(function (k: string) {
    if (ALLOWED_KEYS.indexOf(k) === -1) errors.push("unknown key: " + k);
  });
  if (obj.version !== 1) {
    errors.push("version must be 1");
  }
  if (typeof obj.area !== "string") errors.push("area must be a string");
  if (
    typeof obj.region !== "string" ||
    (REGIONS as readonly string[]).indexOf(obj.region) === -1
  ) {
    errors.push("region must be one of central/east/north/south/west");
  }
  if (typeof obj.proxy !== "string") {
    errors.push("proxy must be a string");
  } else if (obj.proxy !== "" && !/^https?:\/\//.test(obj.proxy)) {
    errors.push('proxy must start with http:// or https:// or be ""');
  }
  const stops: StopConf[] = [];
  const rawStops = obj.stops;
  if (!Array.isArray(rawStops)) {
    errors.push("stops must be a list");
  } else {
    rawStops.forEach(function (s: unknown, i: number) {
      if (!s || typeof s !== "object" || Array.isArray(s)) {
        errors.push("stop #" + (i + 1) + " must be a mapping");
        return;
      }
      const entry = s as Record<string, unknown>;
      Object.keys(entry).forEach(function (k: string) {
        if (ALLOWED_STOP_KEYS.indexOf(k) === -1)
          errors.push("stop #" + (i + 1) + ": unknown key " + k);
      });
      const code = String(entry.code == null ? "" : entry.code).trim();
      if (!/^\d{4,5}$/.test(code)) {
        errors.push(
          "stop #" + (i + 1) + ": code must be 4-5 digits (got " + code + ")",
        );
      }
      const services: string[] = [];
      if (entry.services != null) {
        if (Array.isArray(entry.services)) {
          (entry.services as unknown[]).forEach(function (sv: unknown) {
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
      area: (typeof obj.area === "string" ? obj.area : "").trim(),
      region: obj.region as Region,
      stops: stops,
      proxy: (typeof obj.proxy === "string" ? obj.proxy : "").trim(),
    },
  };
}
