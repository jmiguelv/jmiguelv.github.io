interface SortableProject {
  title: string;
  startYear: number | null;
  endYear: number | null;
}

interface SortablePublication {
  title: string;
  year: number;
}

export function sortProjects(a: SortableProject, b: SortableProject): number {
  const ae = a.endYear ?? a.startYear ?? -Infinity;
  const be = b.endYear ?? b.startYear ?? -Infinity;
  if (be !== ae) return be - ae;
  const as = a.startYear ?? -Infinity;
  const bs = b.startYear ?? -Infinity;
  if (bs !== as) return bs - as;
  return a.title.localeCompare(b.title);
}

export function sortPublications(
  a: SortablePublication,
  b: SortablePublication,
): number {
  if (a.year !== b.year) return b.year - a.year;
  return a.title.localeCompare(b.title);
}
