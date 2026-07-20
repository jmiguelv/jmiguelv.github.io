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
  it("sorts by endYear descending", () => {
    const projects: Project[] = [
      { title: "Old", startYear: 2018, endYear: 2019 },
      { title: "New", startYear: 2022, endYear: 2024 },
    ];
    const sorted = [...projects].sort(sortProjects);
    expect(sorted[0].title).toBe("New");
    expect(sorted[1].title).toBe("Old");
  });

  it("falls back to startYear when endYear is equal", () => {
    const projects: Project[] = [
      { title: "Early start", startYear: 2020, endYear: 2024 },
      { title: "Late start", startYear: 2022, endYear: 2024 },
    ];
    const sorted = [...projects].sort(sortProjects);
    expect(sorted[0].title).toBe("Late start");
    expect(sorted[1].title).toBe("Early start");
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

  it("uses startYear as endYear fallback for ongoing projects", () => {
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
