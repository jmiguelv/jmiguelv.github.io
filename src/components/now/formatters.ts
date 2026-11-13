/* Pure formatting helpers for the now board — no DOM, no state. The exact
   strings here are part of the UI contract (tests pin several). */

export function hhmm(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ago(ts: number | null | undefined): string {
  if (!ts) return "never";
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + " min ago";
  return Math.round(m / 60) + " h ago";
}

export function minsTo(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  if (d <= now) return "arriving";
  const m = Math.round((d - now) / 60000);
  return m + " min";
}

export function psiBand(v: number): string {
  return v <= 50
    ? "Good"
    : v <= 100
      ? "Moderate"
      : v <= 200
        ? "Unhealthy"
        : v <= 300
          ? "Very Unhealthy"
          : "Hazardous";
}

/* NEA 1-hourly PM2.5 bands (2024 refresh, from memory — verify once). */
export function pm25Band(v: number): string {
  return v <= 55 ? "Normal" : v <= 150 ? "Elevated" : "High";
}

export function psiDot(v: number): "g" | "e" | "h" {
  return v <= 50 ? "g" : v <= 100 ? "e" : "h";
}

export function pm25Dot(v: number): "g" | "e" | "h" {
  return v <= 55 ? "g" : v <= 150 ? "e" : "h";
}

export function umbrellaFor(text: string): string {
  return /(shower|rain|thunder|storm)/i.test(text)
    ? "Bring an umbrella."
    : "No umbrella needed.";
}
