import { z } from "astro/zod";

export const projectSchema = z.object({
  title: z.string(),
  links: z
    .array(
      z.object({
        url: z.url(),
        label: z.string(),
      }),
    )
    .min(1),
  startYear: z.number().nullable(),
  endYear: z.number().nullable(),
  partners: z.array(z.string()).default([]),
  summary: z.string(),
});

export const publicationSchema = z.object({
  title: z.string(),
  authors: z.array(z.string()),
  year: z.number(),
  venue: z.string(),
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
