import { mount, tick, unmount } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import NowBoard from "../src/components/now/NowBoard.svelte";
import {
  applyConf,
  createNowState,
} from "../src/components/now/state.svelte.js";
import { parseConfText } from "../src/components/now/conf.js";
import { LS_SETTINGS } from "../src/components/now/state.svelte.js";
import { buildFeeds, drain } from "./now-fixtures";
import type { Settings } from "./now-fixtures";

/* The state factory's return shape, typed for test use. Runes make this
   object a deeply reactive proxy at runtime. */
export interface NowState {
  settings: Settings;
  store: Record<string, { d: unknown; at: number }>;
  errs: Record<string, string>;
  lastFetch: number;
  busLastFetch: number;
  busCache: Record<string, { d: unknown; at: number }>;
  stopNames: Record<string, string>;
  tick: number;
}

/* Island boot test — successor to the VM smoke test: mount the real
   component tree in jsdom with recorded fetch and seeded localStorage,
   then assert the same rendered text the old test pinned. The 30s/5min/
   1min cadence is not driven here (the mount-time refresh is), which is
   exactly what the assertions exercise. */

interface Board {
  requested: string[];
  state: ReturnType<typeof createNowState>;
  text(id: string): string;
}

let app: ReturnType<typeof mount> | undefined;

/* Runs under the vmForks pool (see vitest.config.mts): vitest's native
   client-consumer VM environment plus jsdom, so bare document/window/
   localStorage are the real browser-like globals — no hand-installed
   surface needed. */

async function boot(opts: {
  settings: Partial<Settings>;
  failFeeds?: string[];
}): Promise<Board> {
  const feeds = buildFeeds();
  const requested: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      requested.push(url);
      const fail = (opts.failFeeds || []).some((f) => url.includes(f));
      const key = Object.keys(feeds).find((k) => url.includes(k));
      if (fail || !key)
        return Promise.reject(new Error(fail ? "HTTP 503" : "unknown feed"));
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(feeds[key]),
      });
    }),
  );
  localStorage.clear();
  localStorage.setItem(
    LS_SETTINGS,
    JSON.stringify({
      area: "",
      region: "west",
      stops: [],
      proxy: "",
      ...opts.settings,
    }),
  );
  const state = createNowState();
  app = mount(NowBoard, {
    target: document.body,
    props: { state },
  });
  await drain();
  await tick();
  return {
    requested,
    state,
    text(id: string) {
      const el = document.getElementById(id);
      return (el?.textContent as string) ?? "";
    },
  };
}

afterEach(() => {
  if (app) unmount(app); /* clears the interval + visibility listener */
  app = undefined;
  vi.unstubAllGlobals(); /* drops the per-test fetch stub */
  localStorage.clear();
});

describe("lab/now board boots and renders", () => {
  it("renders verdict, haze, today and outlook from live-shaped feeds", async () => {
    const page = await boot({
      settings: { area: "Jurong West", region: "west", stops: [] },
    });
    expect(page.text("verdict-big")).toBe("Thundery Showers");
    expect(page.text("verdict-guide")).toBe("Bring an umbrella.");
    expect(page.text("air")).toContain("west PSI(24h) 42 · Good");
    expect(page.text("air")).toContain("PM2.5(1h) 5 · Normal");
    expect(page.text("today")).toContain("Thundery Showers");
    expect(page.text("today")).toContain("24–33°C");
    expect(page.text("days")).toContain("Afternoon thundery showers");
    expect(page.text("global")).toContain("all feeds ok");
    expect([...new Set(page.requested)].sort()).toEqual(
      [
        "https://api.data.gov.sg/v1/environment/2-hour-weather-forecast",
        "https://api.data.gov.sg/v1/environment/24-hour-weather-forecast",
        "https://api.data.gov.sg/v1/environment/4-day-weather-forecast",
        "https://api.data.gov.sg/v1/environment/psi",
        "https://api.data.gov.sg/v1/environment/pm25",
      ].sort(),
    );
  });

  it("degrades per-panel when a feed fails, with saved bus stops shown", async () => {
    const page = await boot({
      settings: {
        area: "Jurong West",
        region: "west",
        stops: [{ code: "17009", services: ["96"] }],
      },
      failFeeds: ["psi"],
    });
    expect(page.text("air")).toContain("PSI unavailable.");
    expect(page.text("verdict-big")).toBe("Thundery Showers");
    expect(page.text("buses")).toContain("Stop 17009");
    expect(page.text("buses")).toContain(
      "Arrivals come through your proxy URL",
    );
    expect(page.text("global")).toContain("some feeds failing");
  });

  it("flags PM2.5 separately when only that feed fails", async () => {
    const page = await boot({
      settings: { area: "Jurong West", region: "west", stops: [] },
      failFeeds: ["pm25"],
    });
    expect(page.text("air")).toContain("west PSI(24h) 42 · Good");
    expect(page.text("air")).toContain("PM2.5(1h) —");
    expect(page.text("air-status")).toContain("pm2.5 unavailable");
  });

  it("renders bus countdowns through the proxy, filtered by service", async () => {
    const page = await boot({
      settings: {
        area: "Jurong West",
        region: "west",
        stops: [{ code: "17009", services: ["96"] }],
        proxy: "/api/bus",
      },
    });
    expect(page.text("buses")).toContain("17009 · Blk 409 · Jurong East Ave 1");
    expect(page.text("stops-list")).toContain(
      "17009 · Blk 409 · Jurong East Ave 1 · 96",
    );
    expect(page.text("buses")).not.toContain("Stop 17009");
    /* one service per row: countdowns with their arrival clock times */
    expect(page.text("buses")).toMatch(
      /96 · 3 min \(\d{1,2}:\d{2}[^)]*\), 9 min \(\d{1,2}:\d{2}[^)]*\), 22 min \(\d{1,2}:\d{2}[^)]*\)/,
    );
    expect(page.text("buses")).not.toContain("170 · ");
    expect(page.text("buses")).toContain("arrivals fetched just now");
    expect(page.text("buses")).not.toContain("5 min");
    expect(page.requested).toContain("/api/bus?BusStopCode=17009");
  });

  it("applyConf wires imported conf into the live UI", async () => {
    const page = await boot({
      settings: { area: "Jurong West", region: "west", stops: [] },
    });
    const res = parseConfText(
      JSON.stringify({
        version: 1,
        area: "Ang Mo Kio",
        region: "north",
        stops: [
          { code: "17009", services: ["96"] },
          { code: "07011", services: [] },
        ],
        proxy: "",
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error(String(res.errors));
    applyConf(page.state, res.conf);
    await drain();
    await tick();
    /* verdict re-renders from the cached 2h forecast for the new area */
    expect(page.text("verdict-big")).toBe("Partly Cloudy (Day)");
    expect(page.text("buses")).toContain("Stop 17009");
    expect(page.text("buses")).toContain("Stop 07011");
  });
});
