import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* the handler caches its stop-name map at module scope with a 24h TTL —
   exactly what a warm Vercel instance does. Each test gets a fresh module
   so the map starts cold, like a cold-start function. */
beforeEach(() => {
  vi.resetModules();
});

async function loadHandler() {
  const mod = await import("../api/bus.js");
  return mod.default;
}

/* The Vercel proxy handler, driven with a stubbed LTA. The stop-name walk
   is the part under test: an early-exit bug once left the map at ~2 pages
   (≤1000 lowest-numbered stops), so real stops like 92111 came back with
   `Name: null` and the board printed "Stop 92111" forever. These tests pin
   the pagination contract page by page. */

interface StopRecord {
  BusStopCode: string;
  Description: string;
  RoadName: string;
}

function page(codes: { from: number; to: number }): StopRecord[] {
  const out: StopRecord[] = [];
  for (let i = codes.from; i < codes.to; i++) {
    out.push({
      BusStopCode: String(10001 + i),
      Description: "Stop " + (10001 + i),
      RoadName: "Road " + (i + 1),
    });
  }
  return out;
}

function arrivalsResponse(): Record<string, unknown> {
  return { Services: [] };
}

function stubLta(pages: StopRecord[][], opts: { ignoreSkip?: boolean } = {}) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      calls.push(url);
      if (url.includes("BusArrival")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          text: () => Promise.resolve(JSON.stringify(arrivalsResponse())),
        });
      }
      if (url.includes("BusStops")) {
        const m = /\$skip=(\d+)/.exec(url);
        const skip = m ? Number(m[1]) : 0;
        /* page index by skip, or page 0 forever when the server ignores $skip */
        const pi = opts.ignoreSkip ? 0 : Math.min(skip / 500, pages.length - 1);
        const value = opts.ignoreSkip
          ? pages[0]
          : pages[Math.min(pi, pages.length - 1)];
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ value: value }),
        });
      }
      return Promise.reject(new Error("unexpected url " + url));
    }),
  );
  return { calls };
}

function stubRes(): {
  res: Record<string, unknown>;
  sent: () => { status: number | undefined; body: string | undefined };
} {
  let status: number | undefined;
  let body: string | undefined;
  const res = {
    setHeader() {
      return res;
    },
    status(c: number) {
      status = c;
      return res;
    },
    json(p: unknown) {
      body = JSON.stringify(p);
      return res;
    },
    send(p: string) {
      body = p;
      return res;
    },
    end() {},
  };
  return { res, sent: () => ({ status, body }) };
}

const reqFor = (origin: string, query: Record<string, string>) => ({
  method: "GET",
  headers: { origin },
  query,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/bus stop-name enrichment", () => {
  it("walks past page two so late-alphabet stops resolve", async () => {
    vi.stubEnv("LTA_ACCOUNT_KEY", "test-key");
    const handler = await loadHandler();
    /* three full pages: 92111's slot only exists on page 3 */
    const codes = page({ from: 8200, to: 8350 });
    const stubbed = stubLta([
      Array.from({ length: 500 }, (_, i) => ({
        BusStopCode: "10" + String(100 + i),
        Description: "Early " + i,
        RoadName: "Alpha Rd",
      })),
      Array.from({ length: 500 }, (_, i) => ({
        BusStopCode: "20" + String(100 + i),
        Description: "Mid " + i,
        RoadName: "Beta Rd",
      })),
      [
        {
          BusStopCode: "92111",
          Description: "Opp Polytechnic",
          RoadName: "Anson Rd",
        },
        ...codes.slice(0, 149),
      ],
    ]);
    const { res, sent } = stubRes();
    await handler(
      reqFor("https://jmiguelv.github.io", { BusStopCode: "92111" }) as never,
      res as never,
    );
    expect(sent().status).toBe(200);
    const payload = JSON.parse(sent().body ?? "{}");
    expect(payload.Stop).toEqual({
      BusStopCode: "92111",
      Name: "Opp Polytechnic · Anson Rd",
    });
    /* the walk read all three pages: $skip 0, 500, and 1000 */
    const skips = stubbed.calls
      .filter((u) => u.includes("BusStops"))
      .map((u) => /\$skip=(\d+)/.exec(u)![1]);
    expect(skips).toEqual(["0", "500", "1000"]);
  });

  it("survives a server that ignores $skip, with a bounded walk", async () => {
    vi.stubEnv("LTA_ACCOUNT_KEY", "test-key");
    const handler = await loadHandler();
    /* a full first page so the walk advances ($skip=500) rather than
       exiting on the short-page rule — then the same page comes back */
    const fullPage = Array.from({ length: 500 }, (_, i) => ({
      BusStopCode: "1" + String(1000 + i),
      Description: "Repeat " + i,
      RoadName: "Loop Rd",
    }));
    const stubbed = stubLta([fullPage], { ignoreSkip: true });
    const { res, sent } = stubRes();
    await handler(
      reqFor("https://jmiguelv.github.io", { BusStopCode: "11000" }) as never,
      res as never,
    );
    expect(sent().status).toBe(200);
    const payload = JSON.parse(sent().body ?? "{}");
    expect(payload.Stop?.Name).toBe("Repeat 0 · Loop Rd");
    /* recognised the repeat after the second identical page and stopped */
    const walks = stubbed.calls.filter((u) => u.includes("BusStops")).length;
    expect(walks).toBe(2);
  });

  it("sets Name to null when the stop is not in the BusStops dataset", async () => {
    vi.stubEnv("LTA_ACCOUNT_KEY", "test-key");
    const handler = await loadHandler();
    stubLta([
      [
        {
          BusStopCode: "10001",
          Description: "Alpha",
          RoadName: "Rd",
        },
      ],
    ]);
    const { res, sent } = stubRes();
    await handler(
      reqFor("https://jmiguelv.github.io", { BusStopCode: "99999" }) as never,
      res as never,
    );
    expect(sent().status).toBe(200);
    const payload = JSON.parse(sent().body ?? "{}");
    expect(payload.Stop).toEqual({ BusStopCode: "99999", Name: null });
  });
});
