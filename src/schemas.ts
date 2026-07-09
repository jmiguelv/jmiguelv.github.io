import { z } from "astro/zod";

const nonEmptyString = z.string().trim().min(1);

export const projectSchema = z
  .object({
    title: nonEmptyString,
    links: z
      .array(
        z.object({
          url: z.url(),
          label: nonEmptyString,
        }),
      )
      .min(1),
    startYear: z.number().nullable(),
    endYear: z.number().nullable(),
    partners: z.array(nonEmptyString).default([]),
    summary: nonEmptyString,
  })
  .refine(
    (p) =>
      p.startYear === null || p.endYear === null || p.startYear <= p.endYear,
    { message: "startYear must not be after endYear" },
  );

export const publicationSchema = z.object({
  title: nonEmptyString,
  authors: z.array(nonEmptyString),
  year: z.number(),
  venue: nonEmptyString.optional(),
  url: z.url().optional(),
  type: z.enum([
    "article",
    "chapter",
    "conference",
    "report",
    "book",
    "software",
    "dataset",
    "website",
  ]),
});
