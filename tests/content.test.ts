import { describe, it, expect } from "vitest";
import { projectSchema, publicationSchema } from "../src/schemas";
import { loadMarkdownFiles } from "./helpers";

// ── Tests ──────────────────────────────────────────────────────────────────

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

  it.each(projects.map((p) => [p.file, p.frontmatter]))(
    "%s has a non-empty summary",
    (_file, frontmatter) => {
      expect((frontmatter.summary as string).trim().length).toBeGreaterThan(0);
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
