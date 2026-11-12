import { describe, expect, it } from "vitest";
import {
  FEED_URLS,
  BUS_FETCH_MS,
  REFRESH_MS,
  API,
} from "../src/components/now/feeds.js";
import { parseConfText, serializeConf } from "../src/components/now/conf.js";
import { createNowState } from "../src/components/now/state.svelte.js";
import type { Settings } from "./now-fixtures";

/* Conf export/import, endpoint pinning, and pacing constants — all pure
   logic, no DOM: the versioned JSON funnel and the feed URL list are the
   two spots where silent drift would be worst, so they are pinned
   directly. */

describe("conf export/import (pure module)", () => {
  const seededSettings = {
    area: "Jurong West",
    region: "west",
    stops: [
      { code: "17009", services: ["96", "197"] },
      { code: "07011", services: [] as string[] },
    ],
    proxy: "https://x.example/api/bus",
  };

  it("round-trips its own JSON export through parse()", () => {
    const res = parseConfText(JSON.stringify(serializeConf(seededSettings)));
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error(String(res.errors));
    const twice = parseConfText(JSON.stringify(res.conf));
    if (!twice.ok) throw new Error(String(twice.errors));
    expect(twice.conf).toEqual(res.conf);
  });

  it("accepts JSON input and normalizes it", () => {
    const res = parseConfText(
      JSON.stringify({
        version: 1,
        area: " Bedok ",
        region: "east",
        stops: [{ code: 12345, services: [96] }],
        proxy: "",
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error(String(res.errors));
    expect(res.conf.area).toBe("Bedok");
    expect(res.conf.stops).toEqual([{ code: "12345", services: ["96"] }]);
  });

  it("rejects unknown keys, bad regions, and bad versions together", () => {
    const res = parseConfText(
      JSON.stringify({
        version: 2,
        region: "northeast",
        stpops: [],
      }),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors).toContain("version must be 1");
      expect(res.errors).toContain(
        "region must be one of central/east/north/south/west",
      );
      expect(res.errors).toContain("unknown key: stpops");
    }
  });

  it("reports the JSON engine's own error for garbage instead of guessing", () => {
    const res = parseConfText("just some words on a line");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors[0]).toContain("not valid JSON");
  });

  it("rejects an empty box and non-objects, by name", () => {
    const empty = parseConfText("   ");
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.errors).toEqual(["conf box is empty"]);
    const array = parseConfText("[1,2]");
    expect(array.ok).toBe(false);
    if (!array.ok) expect(array.errors).toEqual(["conf must be an object"]);
  });
});

describe("feed endpoint pinning", () => {
  it("exposes exactly the five verified data.gov.sg URLs", () => {
    expect(Object.values(FEED_URLS).sort()).toEqual(
      [
        API + "/2-hour-weather-forecast",
        API + "/24-hour-weather-forecast",
        API + "/4-day-weather-forecast",
        API + "/psi",
        API + "/pm25",
      ].sort(),
    );
  });

  it("paces feeds at 5 minutes and bus polls at 1 minute", () => {
    expect(REFRESH_MS).toBe(5 * 60 * 1000);
    expect(BUS_FETCH_MS).toBe(60 * 1000);
  });
});

describe("now state factory", () => {
  it("starts with silent defaults (SSR shows Loading, not stored data)", () => {
    const state = createNowState();
    const s = state.settings as unknown as Settings;
    expect(s.area).toBe("");
    expect(s.region).toBe("west");
    expect(s.stops).toEqual([]);
    expect(s.proxy).toBe("");
    expect(state.store).toEqual({});
  });
});
