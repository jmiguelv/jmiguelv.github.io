import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
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
  }),
});

const publications = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/publications' }),
  schema: z.object({
    title: z.string(),
    authors: z.array(z.string()),
    year: z.number(),
    venue: z.string(),
    url: z.url().optional(),
    type: z.enum(['article', 'chapter', 'conference', 'report']),
  }),
});

export const collections = { projects, publications };
