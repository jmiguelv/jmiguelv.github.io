import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { discoverLabEntries } from "../src/utils/lab";

const fixtures = join("tests", "fixtures", "lab");
const broken = join("tests", "fixtures", "lab-broken");
const real = join("public", "lab");

// ── Tests ──────────────────────────────────────────────────────────────────

describe("lab index discovery", () => {
  it("derives the live listing from the prototypes themselves", () => {
    const entries = discoverLabEntries(real);
    expect(entries.map((e) => e.slug)).toEqual([
      "clock-quest",
      "note-builder",
      "now",
    ]);
    const noteBuilder = entries.find((e) => e.slug === "note-builder");
    expect(noteBuilder?.title).toBe(
      "Note Builder: make the price in different ways",
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
});
