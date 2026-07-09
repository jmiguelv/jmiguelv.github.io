import { describe, it, expect } from "vitest";
import { projectSchema, publicationSchema } from "../src/schemas";

const validProject = {
  title: "A Project",
  links: [{ url: "https://example.com", label: "Website" }],
  startYear: 2020,
  endYear: 2022,
  summary: "A summary.",
};

const validPublication = {
  title: "A Publication",
  authors: ["Miguel Vieira"],
  year: 2024,
  venue: "A Venue",
  type: "article",
};

describe("projectSchema", () => {
  it("accepts a valid project", () => {
    expect(projectSchema.safeParse(validProject).success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = projectSchema.safeParse({ ...validProject, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty summary", () => {
    const result = projectSchema.safeParse({ ...validProject, summary: " " });
    expect(result.success).toBe(false);
  });

  it("rejects an empty link label", () => {
    const result = projectSchema.safeParse({
      ...validProject,
      links: [{ url: "https://example.com", label: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects startYear after endYear", () => {
    const result = projectSchema.safeParse({
      ...validProject,
      startYear: 2023,
      endYear: 2022,
    });
    expect(result.success).toBe(false);
  });

  it("accepts null years", () => {
    const result = projectSchema.safeParse({
      ...validProject,
      startYear: null,
      endYear: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("publicationSchema", () => {
  it("accepts a valid publication", () => {
    expect(publicationSchema.safeParse(validPublication).success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = publicationSchema.safeParse({
      ...validPublication,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty venue", () => {
    const result = publicationSchema.safeParse({
      ...validPublication,
      venue: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a missing venue", () => {
    const withoutVenue = { ...validPublication, venue: undefined };
    expect(publicationSchema.safeParse(withoutVenue).success).toBe(true);
  });

  it("rejects an empty author name", () => {
    const result = publicationSchema.safeParse({
      ...validPublication,
      authors: [""],
    });
    expect(result.success).toBe(false);
  });
});
