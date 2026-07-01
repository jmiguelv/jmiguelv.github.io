interface SortableProject {
  title: string;
  startYear: number | null;
  endYear: number | null;
}

interface SortablePublication {
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
  return b.year - a.year;
}
