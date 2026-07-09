import fs from "node:fs";
import matter from "gray-matter";
import { describe, it, expect } from "vitest";
import { aboutSchema, projectSchema, publicationSchema } from "../src/schemas";
import { loadMarkdownFiles } from "./helpers";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("about content", () => {
  const about = matter(fs.readFileSync("src/content/about.md", "utf-8"));

  it("frontmatter validates against schema", () => {
    const result = aboutSchema.safeParse(about.data);
    if (!result.success) {
      throw new Error(
        result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("\n"),
      );
    }
  });
});

describe("projects content", () => {
  const projects = loadMarkdownFiles("src/content/projects");

  it("has at least one project", () => {
    expect(projects.length).toBeGreaterThan(0);
  });

  it.each(projects.map((p) => [p.file, p.frontmatter]))(
    "%s validates against schema",
    (_file, frontmatter) => {
      const result = projectSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          result.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("\n"),
        );
      }
    },
  );
});

describe("publications content", () => {
  const publications = loadMarkdownFiles("src/content/publications");

  it("has at least one publication", () => {
    expect(publications.length).toBeGreaterThan(0);
  });

  it.each(publications.map((p) => [p.file, p.frontmatter]))(
    "%s validates against schema",
    (_file, frontmatter) => {
      const result = publicationSchema.safeParse(frontmatter);
      if (!result.success) {
        throw new Error(
          result.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("\n"),
        );
      }
    },
  );
});
