import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { loadMarkdownFiles } from "./helpers";

interface UrlEntry {
  url: string;
  source: string;
}

// ── URL extraction ─────────────────────────────────────────────────────────

const projectUrls = loadMarkdownFiles("src/content/projects").flatMap((p) => {
  const links = p.frontmatter.links as Array<{ url: string }> | undefined;
  return links ? links.map((l) => ({ url: l.url, source: p.file })) : [];
});

const publicationUrls = loadMarkdownFiles("src/content/publications").map(
  (p) => ({
    url: p.frontmatter.url as string,
    source: p.file,
  }),
);

// Deduplicate by URL, keeping the first source
const seen = new Set<string>();
const allUrls = [...projectUrls, ...publicationUrls].filter((e) => {
  if (!e.url || seen.has(e.url)) return false;
  seen.add(e.url);
  return true;
});

// ── Fetch with limited concurrency ─────────────────────────────────────────

interface FetchResult {
  status: number;
  ok: boolean;
  error?: string;
}

const CHECKER_UA = "jmiguelv-portfolio-link-checker";
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function rawFetch(
  url: string,
  timeoutMs: number,
  userAgent = CHECKER_UA,
): Promise<FetchResult> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": userAgent },
    });
    return { status: response.status, ok: response.status < 400 };
  } catch (e) {
    const cause = e as { cause?: { code?: string } };
    return {
      status: 0,
      ok: false,
      error: cause.cause?.code ?? (e as Error).message,
    };
  }
}

const TLS_ERRORS = [
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
];

async function fetchUrl(url: string, timeoutMs = 60_000): Promise<FetchResult> {
  const result = await rawFetch(url, timeoutMs);

  // 403 from bot protection (Cloudflare, etc.) — URL is reachable, not broken
  if (result.status === 403) return { status: 403, ok: true };

  // Some servers reject unfamiliar user agents outright — retry as a browser
  if (result.status >= 400 && result.status < 500) {
    return rawFetch(url, timeoutMs, BROWSER_UA);
  }

  return result;
}

interface CheckResult {
  entry: UrlEntry;
  result: FetchResult;
}

async function fetchBatched(
  entries: UrlEntry[],
  concurrency: number,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  for (let i = 0; i < entries.length; i += concurrency) {
    const batch = entries.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (entry) => ({
        entry,
        result: await fetchUrl(entry.url),
      })),
    );
    results.push(...batchResults);
  }
  return results;
}

async function checkUrls(
  entries: UrlEntry[],
  concurrency = 5,
): Promise<CheckResult[]> {
  const results = await fetchBatched(entries, concurrency);

  // Retry TLS cert errors with verification disabled — link checker verifies
  // reachability, not TLS configuration (browsers and curl are more lenient).
  // Done as a separate pass so NODE_TLS_REJECT_UNAUTHORIZED only affects
  // these retries, never the regular fetches running concurrently.
  const tlsFailures = results.filter((r) =>
    TLS_ERRORS.includes(r.result.error ?? ""),
  );
  if (tlsFailures.length > 0) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    let retried: CheckResult[];
    try {
      retried = await fetchBatched(
        tlsFailures.map((r) => r.entry),
        concurrency,
      );
    } finally {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    }
    const byUrl = new Map(retried.map((r) => [r.entry.url, r]));
    return results.map((r) => byUrl.get(r.entry.url) ?? r);
  }

  return results;
}

// ── Tests ──────────────────────────────────────────────────────────────────

// Suppress unhandled socket errors from HTTP/2 connection pooling
const socketErrorHandler = (err: Error) => {
  if ((err as NodeJS.ErrnoException).code === "UND_ERR_SOCKET") return;
  throw err;
};

describe("link rot", () => {
  beforeAll(() => {
    process.on("uncaughtException", socketErrorHandler);
  });

  afterAll(() => {
    process.off("uncaughtException", socketErrorHandler);
  });

  it("all external URLs return 2xx or 3xx", { timeout: 300_000 }, async () => {
    const results = await checkUrls(allUrls);
    const failures = results.filter((r) => !r.result.ok);

    if (failures.length > 0) {
      const report = failures
        .map(
          (f) =>
            `  ${f.entry.url} (${f.entry.source}) — ${f.result.error ?? `HTTP ${f.result.status}`}`,
        )
        .join("\n");
      throw new Error(`${failures.length} broken link(s) found:\n${report}`);
    }

    expect(failures).toHaveLength(0);
  });
});
