/* Shared fixtures for the now board island tests — the same live-shaped
   payloads the previous VM boot test used. Everything asserts on the
   rendered DOM text, so the shapes are the contract. */

export interface Settings {
  area: string;
  region: string;
  stops: { code: string; services: string[] }[];
  proxy: string;
}

/* ETAs are relative to fixture build time so rendered minutes are
   deterministic (3, 9, 22). */
export function buildFeeds(): Record<string, Record<string, unknown>> {
  return {
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
    /* LTA BusArrivalv2 shape, served by the key-holding proxy at
       <proxy>?BusStopCode=<code> — the Vercel function enriches it with
       the stop's name (Description · RoadName). */
    "api/bus": {
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
}

export interface MountedBoard {
  requested: string[];
  text(idOrSelector: string): string;
  unmount(): void;
}

/* With the @vitest-environment jsdom pragma on the test file, vitest
   installs the window/document globals; Svelte's mount() then boots the
   real component tree. drain() settles fetch promises plus reactivity. */
export function drain(times = 12): Promise<void> {
  let n = times;
  return new Promise(function pump(resolve) {
    if (n-- <= 0) return resolve();
    setImmediate(function () {
      pump(resolve);
    });
  });
}
