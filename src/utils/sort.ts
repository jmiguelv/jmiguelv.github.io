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
  const as = a.startYear ?? -Infinity;
  const bs = b.startYear ?? -Infinity;
  if (bs !== as) return bs - as;
  const ae = a.endYear ?? Infinity;
  const be = b.endYear ?? Infinity;
  if (be !== ae) return be - ae;
  return a.title.localeCompare(b.title);
}

export function sortPublications(
  a: SortablePublication,
  b: SortablePublication,
): number {
  if (a.year !== b.year) return b.year - a.year;
  return a.title.localeCompare(b.title);
}
