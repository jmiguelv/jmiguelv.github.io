import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface LabEntry {
  /** directory name — the live URL is /lab/<slug>/ */
  slug: string;
  title: string;
  description: string;
}

/* The prototypes in public/lab are plain assets and their own source of
   truth, so the lab index derives its listing directly from them instead
   of duplicating it in a content collection. Contract per prototype, made
   loud here at build time: an <title> and a non-empty meta description.
   Skipping silently is not allowed — that is how listings go stale. */
export function discoverLabEntries(labDir: string): LabEntry[] {
  const entries = readdirSync(labDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ slug: d.name, file: join(labDir, d.name, "index.html") }))
    .filter(({ file }) => existsSync(file))
    .map(({ slug, file }) => {
      const html = readFileSync(file, "utf8");
      const title = html.match(/<title>([\s\S]*?)<\/title>/i);
      if (!title || !title[1].trim()) {
        throw new Error(`${file}: missing <title>`);
      }
      const description = metaDescription(html);
      if (!description) {
        throw new Error(`${file}: missing meta description`);
      }
      return { slug, title: title[1].trim(), description };
    });
  entries.sort((a, b) => a.slug.localeCompare(b.slug));
  return entries;
}

/* Attribute order in <meta> varies between hand-written files; pick the
   description tag by its name, then read content off the same tag. */
function metaDescription(html: string): string | null {
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metas) {
    if (!/\bname\s*=\s*["']description["']/i.test(tag)) continue;
    const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
    return content && content[1].trim() ? content[1].trim() : null;
  }
  return null;
}
