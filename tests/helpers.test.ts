import { describe, it, expect } from "vitest";
import { loadMarkdownFiles } from "./helpers";

describe("loadMarkdownFiles", () => {
  it("loads markdown files from nested directories", () => {
    const files = loadMarkdownFiles("tests/fixtures/nested");
    const titles = files.map((f) => f.frontmatter.title).sort();
    expect(titles).toEqual(["Nested", "Top level"]);
  });
});
