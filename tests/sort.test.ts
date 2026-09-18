import { describe, it, expect } from "vitest";
import { sortProjects, sortPublications } from "../src/utils/sort";

interface Project {
  title: string;
  startYear: number | null;
  endYear: number | null;
}

interface Publication {
  title: string;
  year: number;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("project sort order", () => {
  it("sorts by startYear descending", () => {
    const projects: Project[] = [
      { title: "Long-running", startYear: 2018, endYear: 2026 },
      { title: "Recent", startYear: 2022, endYear: 2024 },
    ];
    const sorted = [...projects].sort(sortProjects);
    expect(sorted[0].title).toBe("Recent");
    expect(sorted[1].title).toBe("Long-running");
  });

  it("surfaces new work above earlier projects that end later", () => {
    const projects: Project[] = [
      { title: "Started earlier, ends later", startYear: 2025, endYear: 2027 },
      { title: "New work", startYear: 2026, endYear: null },
    ];
    const sorted = [...projects].sort(sortProjects);
    expect(sorted[0].title).toBe("New work");
    expect(sorted[1].title).toBe("Started earlier, ends later");
  });

  it("sorts by endYear descending within the same startYear", () => {
    const projects: Project[] = [
      { title: "Ends sooner", startYear: 2025, endYear: 2026 },
      { title: "Ends later", startYear: 2025, endYear: 2027 },
    ];
    const sorted = [...projects].sort(sortProjects);
    expect(sorted[0].title).toBe("Ends later");
    expect(sorted[1].title).toBe("Ends sooner");
  });

  it("ranks ongoing projects above finished work within the same startYear", () => {
    const projects: Project[] = [
      { title: "Finished", startYear: 2026, endYear: 2026 },
      { title: "Ongoing", startYear: 2026, endYear: null },
    ];
    const sorted = [...projects].sort(sortProjects);
    expect(sorted[0].title).toBe("Ongoing");
    expect(sorted[1].title).toBe("Finished");
  });

  it("falls back to title when years are equal", () => {
    const projects: Project[] = [
      { title: "Bravo", startYear: 2022, endYear: 2024 },
      { title: "Alpha", startYear: 2022, endYear: 2024 },
    ];
    const sorted = [...projects].sort(sortProjects);
    expect(sorted[0].title).toBe("Alpha");
    expect(sorted[1].title).toBe("Bravo");
  });

  it("sorts ongoing work above older finished work", () => {
    const projects: Project[] = [
      { title: "Finished", startYear: 2020, endYear: 2021 },
      { title: "Ongoing", startYear: 2023, endYear: null },
    ];
    const sorted = [...projects].sort(sortProjects);
    expect(sorted[0].title).toBe("Ongoing");
    expect(sorted[1].title).toBe("Finished");
  });

  it("handles null years gracefully", () => {
    const projects: Project[] = [
      { title: "No dates", startYear: null, endYear: null },
      { title: "Has dates", startYear: 2020, endYear: 2022 },
    ];
    const sorted = [...projects].sort(sortProjects);
    expect(sorted[0].title).toBe("Has dates");
    expect(sorted[1].title).toBe("No dates");
  });
});

describe("publication sort order", () => {
  it("sorts by year descending", () => {
    const publications: Publication[] = [
      { title: "Old", year: 2018 },
      { title: "New", year: 2024 },
    ];
    const sorted = [...publications].sort(sortPublications);
    expect(sorted[0].title).toBe("New");
    expect(sorted[1].title).toBe("Old");
  });

  it("sorts by title ascending within the same year", () => {
    const publications: Publication[] = [
      { title: "Bravo", year: 2024 },
      { title: "Alpha", year: 2024 },
    ];
    const sorted = [...publications].sort(sortPublications);
    expect(sorted[0].title).toBe("Alpha");
    expect(sorted[1].title).toBe("Bravo");
  });

  it("keeps year descending before title tiebreaker", () => {
    const publications: Publication[] = [
      { title: "Zebra", year: 2020 },
      { title: "Alpha", year: 2024 },
      { title: "Bravo", year: 2024 },
    ];
    const sorted = [...publications].sort(sortPublications);
    expect(sorted.map((p) => p.title)).toEqual(["Alpha", "Bravo", "Zebra"]);
  });
});
