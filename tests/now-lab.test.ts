import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

/* Smoke test for the /lab/now/ board (public/lab/now/index.html).
   The page is a plain asset with no build step, so the only safety net it
   gets is this: boot the inline script with a stub DOM and fake feeds and
   assert the render path completes. This catches the undefined-reference
   class of bug that `node --check` cannot (it once shipped as
   "load is not defined"). */

const pageHtml = readFileSync(
  resolve(__dirname, "../public/lab/now/index.html"),
  "utf8",
);
const scriptMatch = pageHtml.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error("no inline script found in now/index.html");
const scriptCode = scriptMatch[1];

interface StubEl {
  tagName: string;
  children: StubEl[];
  className: string;
  textContent: string;
  value: string;
  hidden: boolean;
  dataset: Record<string, string>;
  [key: string]: unknown;
  appendChild(child: StubEl): StubEl;
  removeChild(child: StubEl): StubEl;
  replaceChild(next: StubEl, old: StubEl): StubEl;
  setAttribute(name: string, value: string): void;
  readonly firstChild: StubEl | null;
  readonly lastChild: StubEl | null;
}

function makeEl(tag: string): StubEl {
  const el: StubEl = {
    tagName: tag,
    children: [],
    className: "",
    textContent: "",
    value: "",
    hidden: false,
    dataset: {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((c) => c !== child);
      return child;
    },
    replaceChild(next, old) {
      const i = this.children.indexOf(old);
      if (i >= 0) this.children[i] = next;
      return old;
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    get firstChild() {
      return this.children[0] ?? null;
    },
    get lastChild() {
      return this.children[this.children.length - 1] ?? null;
    },
  };
  let ownText = "";
  Object.defineProperty(el, "textContent", {
    get(): string {
      return ownText + el.children.map((c) => String(c.textContent)).join("");
    },
    set(v: unknown) {
      ownText = v == null ? "" : String(v);
      el.children.length = 0;
    },
  });
  return el;
}

interface Fixture {
  body: Record<string, unknown>;
}

const FEEDS: Record<string, Record<string, unknown>> = {
  "2-hour-weather-forecast": {
    items: [
      {
        valid_period: {
          start: "2026-11-10T12:30:00+08:00",
          end: "2026-11-10T14:30:00+08:00",
        },
        forecasts: [
          { area: "Ang Mo Kio", forecast: "Partly Cloudy (Day)" },
          { area: "Jurong West", forecast: "Thundery Showers" },
        ],
      },
    ],
  },
  "24-hour-weather-forecast": {
    items: [
      {
        general: {
          forecast: "Thundery Showers",
          temperature: { low: 24, high: 33 },
          relative_humidity: { low: 60, high: 95 },
          wind: { direction: "VARIABLE", speed: { low: 5, high: 15 } },
        },
        periods: [
          {
            time: {
              start: "2026-11-10T12:00:00+08:00",
              end: "2026-11-10T18:00:00+08:00",
            },
            regions: {
              central: "Cloudy",
              east: "Cloudy",
              north: "Cloudy",
              south: "Cloudy",
              west: "Thundery Showers",
            },
          },
        ],
      },
    ],
  },
  "4-day-weather-forecast": {
    items: [
      {
        forecasts: [
          {
            date: "2026-11-11",
            forecast: "Afternoon thundery showers",
            temperature: { low: 24, high: 34 },
          },
        ],
      },
    ],
  },
  psi: {
    items: [
      {
        readings: {
          psi_twenty_four_hourly: {
            central: 40,
            east: 40,
            north: 38,
            south: 47,
            west: 42,
          },
        },
      },
    ],
  },
  pm25: {
    items: [
      {
        readings: {
          pm25_one_hourly: {
            central: 5,
            east: 13,
            north: 7,
            south: 12,
            west: 5,
          },
        },
      },
    ],
  },
  /* LTA BusArrivalv2 shape, served by the user's key-holding proxy at
     <proxy>?BusStopCode=<code>. ETAs are relative to module load so the
     rendered minutes are deterministic (3, 9, 22). */
  "api/bus": {
    /* The Vercel proxy enriches the LTA payload with the stop's name
       (Description · RoadName) when its cached BusStops map is warm. */
    Stop: { BusStopCode: "17009", Name: "Blk 409 · Jurong East Ave 1" },
    Services: [
      {
        ServiceNo: "96",
        NextBus: {
          EstimatedArrival: new Date(Date.now() + 3 * 60000).toISOString(),
        },
        NextBus2: {
          EstimatedArrival: new Date(Date.now() + 9 * 60000).toISOString(),
        },
        NextBus3: {
          EstimatedArrival: new Date(Date.now() + 22 * 60000).toISOString(),
        },
      },
      {
        ServiceNo: "170",
        NextBus: {
          EstimatedArrival: new Date(Date.now() + 5 * 60000).toISOString(),
        },
      },
    ],
  },
};

interface RunOptions {
  settings: Record<string, unknown>;
  failFeeds?: string[];
}

interface Conf {
  version: number;
  area: string;
  region: string;
  stops: { code: string; services: string[] }[];
  proxy: string;
}

async function boot({ settings, failFeeds = [] }: RunOptions) {
  const els = new Map<string, StubEl>();
  const documentStub = {
    visibilityState: "visible",
    addEventListener() {},
    getElementById(id: string): StubEl {
      let el = els.get(id);
      if (!el) {
        el = makeEl("div");
        el.dataset.id = id;
        els.set(id, el);
      }
      return el;
    },
    createElement(tag: string): StubEl {
      return makeEl(tag);
    },
    createTextNode(text: string): StubEl {
      const node = makeEl("#text");
      node.textContent = text;
      return node;
    },
  };
  const settingsJson = JSON.stringify(settings);
  /* Every URL the page requests, recorded so the test can pin the exact
     endpoint set (see the 2026-11-10 24-hour-forecast 403 incident). */
  const requested: string[] = [];

  const sandbox = {
    document: documentStub,
    AbortController,
    console,
    fetch(
      _url: string,
    ): Promise<
      Fixture | { ok: boolean; json(): Promise<Record<string, unknown>> }
    > {
      requested.push(_url);
      const fail = failFeeds.some((f) => _url.includes(f));
      const key = Object.keys(FEEDS).find((k) => _url.includes(k));
      if (fail || !key)
        return Promise.reject(new Error(fail ? "HTTP 503" : "unknown feed"));
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(FEEDS[key]),
      });
    },
    localStorage: {
      getItem(key: string): string | null {
        return key === "now.settings.v1" ? settingsJson : null;
      },
      setItem() {},
      removeItem() {},
    },
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
  };

  vm.runInNewContext(scriptCode, sandbox as unknown as vm.Context);
  for (let i = 0; i < 12; i++) {
    await new Promise((resolveTick) => setImmediate(resolveTick));
  }
  const confApi = (sandbox as { __nowConf?: unknown }).__nowConf as
    | {
        parse(text: string): { ok: boolean; errors?: string[]; conf?: Conf };
        obj(): Conf;
        apply(conf: Conf): void;
      }
    | undefined;
  return {
    requested,
    confApi,
    text(id: string): string {
      return String(documentStub.getElementById(id).textContent ?? "");
    },
  };
}

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
    const EXPECTED_ENDPOINTS = [
      "https://api.data.gov.sg/v1/environment/2-hour-weather-forecast",
      "https://api.data.gov.sg/v1/environment/24-hour-weather-forecast",
      "https://api.data.gov.sg/v1/environment/4-day-weather-forecast",
      "https://api.data.gov.sg/v1/environment/psi",
      "https://api.data.gov.sg/v1/environment/pm25",
    ];
    expect([...new Set(page.requested)].sort()).toEqual(
      [...EXPECTED_ENDPOINTS].sort(),
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
    expect(page.text("buses")).toContain("96: 3 min, 9 min, 22 min");
    expect(page.text("buses")).toContain("arrivals fetched just now");
    expect(page.text("buses")).not.toContain("170:");
    expect(page.text("buses")).not.toContain("5 min");
    /* the proxy URL is separate from the pinned weather endpoint set */
    expect(page.requested).toContain("/api/bus?BusStopCode=17009");
  });
});

describe("lab/now conf export/import", () => {
  const seeded = (): RunOptions => ({
    settings: {
      area: "Jurong West",
      region: "west",
      stops: [
        { code: "17009", services: ["96", "197"] },
        { code: "07011", services: [] },
      ],
      proxy: "https://x.example/api/bus",
    },
  });

  it("round-trips its own JSON export through parse()", async () => {
    const page = await boot(seeded());
    expect(page.confApi).toBeDefined();
    const res = page.confApi!.parse(JSON.stringify(page.confApi!.obj()));
    expect(res.ok).toBe(true);
    expect(res.conf).toEqual(page.confApi!.obj());
  });

  it("accepts JSON input and normalizes it", async () => {
    const page = await boot(seeded());
    const res = page.confApi!.parse(
      JSON.stringify({
        version: 1,
        area: " Bedok ",
        region: "east",
        stops: [{ code: 12345, services: [96] }],
        proxy: "",
      }),
    );
    expect(res.ok).toBe(true);
    expect(res.conf!.area).toBe("Bedok");
    expect(res.conf!.stops).toEqual([{ code: "12345", services: ["96"] }]);
  });

  it("rejects unknown keys, bad regions, and bad versions together", async () => {
    const page = await boot(seeded());
    const res = page.confApi!.parse(
      JSON.stringify({
        version: 2,
        region: "northeast",
        stpops: [],
      }),
    );
    expect(res.ok).toBe(false);
    expect(res.errors).toContain("version must be 1");
    expect(res.errors).toContain(
      "region must be one of central/east/north/south/west",
    );
    expect(res.errors).toContain("unknown key: stpops");
  });

  it("reports the JSON engine's own error for garbage instead of guessing", async () => {
    const page = await boot(seeded());
    const res = page.confApi!.parse("just some words on a line");
    expect(res.ok).toBe(false);
    expect(res.errors![0]).toContain("not valid JSON");
  });

  it("apply() wires imported conf into the live UI", async () => {
    const page = await boot({
      settings: { area: "Jurong West", region: "west", stops: [] },
    });
    const res = page.confApi!.parse(
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
    page.confApi!.apply(res.conf!);
    /* verdict re-renders from the cached 2h forecast for the new area */
    expect(page.text("verdict-big")).toBe("Partly Cloudy (Day)");
    expect(page.text("buses")).toContain("Stop 17009");
    expect(page.text("buses")).toContain("Stop 07011");
  });
});
