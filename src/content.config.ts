import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    url: z.string().url(),
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
    url: z.string().url().optional(),
    type: z.enum(['article', 'chapter', 'conference', 'report']),
  }),
});

export const collections = { projects, publications };
