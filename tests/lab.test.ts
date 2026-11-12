import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  discoverAllLabEntries,
  discoverAstroLabEntries,
  discoverLabEntries,
  type LabEntry,
} from "../src/utils/lab";

const fixtures = join("tests", "fixtures", "lab");
const broken = join("tests", "fixtures", "lab-broken");
const astroPages = join("tests", "fixtures", "lab-pages");
const astroBroken = join("tests", "fixtures", "lab-pages-broken");
const real = join("public", "lab");
const realAstro = join("src", "pages", "lab");

// ── Tests ──────────────────────────────────────────────────────────────────

describe("lab index discovery", () => {
  it("derives the live listing from the prototypes themselves", () => {
    const entries = discoverAllLabEntries(real, realAstro);
    expect(entries.map((e) => e.slug)).toEqual([
      "clock-quest",
      "note-builder",
      "now",
    ]);
    const noteBuilder = entries.find((e) => e.slug === "note-builder");
    expect(noteBuilder?.title).toBe(
      "Note Builder: make the price in different ways",
    );
    const now = entries.find((e: LabEntry) => e.slug === "now");
    expect(now?.title).toBe("now");
    expect(now?.description).toMatch(
      /board for heading out the door — rain verdict, air quality, and live bus arrivals/,
    );
    entries.forEach((e) => {
      expect(e.description.length).toBeGreaterThan(0);
    });
  });

  it("extracts titles and descriptions regardless of attribute order", () => {
    const bySlug = new Map(
      discoverLabEntries(fixtures).map((e) => [e.slug, e]),
    );
    expect(bySlug.get("widget")).toMatchObject({
      title: "Widget Lab",
      description: "first try",
    });
    expect(bySlug.get("gadget")).toMatchObject({
      title: "Gadget Lab",
      description: "reversed attrs",
    });
  });

  it("skips directories without an index.html", () => {
    const slugs = discoverLabEntries(fixtures).map((e) => e.slug);
    expect(slugs).toEqual(["gadget", "widget"]);
  });

  it("fails loudly when a prototype has no title", () => {
    expect(() => discoverLabEntries(join(broken, "no-title"))).toThrow(
      /bad\/index\.html[\s\S]*missing <title>/,
    );
  });

  it("fails loudly when a prototype has no meta description", () => {
    expect(() => discoverLabEntries(join(broken, "no-description"))).toThrow(
      /bad\/index\.html[\s\S]*missing meta description/,
    );
  });

  it("lists Astro lab pages by their labTitle and Base description", () => {
    const entries = discoverAstroLabEntries(astroPages);
    expect(entries).toEqual([
      {
        slug: "alpha",
        title: "Alpha",
        description: "Alpha fixture description.",
      },
    ]);
  });

  it("fails loudly when an Astro lab page has no labTitle", () => {
    expect(() =>
      discoverAstroLabEntries(join(astroBroken, "no-labtitle")),
    ).toThrow(/stub\.astro[\s\S]*need export const labTitle/);
  });

  it("fails loudly when an Astro lab page has no description", () => {
    expect(() =>
      discoverAstroLabEntries(join(astroBroken, "no-description")),
    ).toThrow(/stub\.astro[\s\S]*need a description on Base/);
  });

  it("merges and sorts both sources for the index", () => {
    const merged = discoverAllLabEntries(fixtures, astroPages);
    expect(merged.map((e) => e.slug)).toEqual(["alpha", "gadget", "widget"]);
  });
});
