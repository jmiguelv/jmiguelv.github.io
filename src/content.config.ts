import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { projectSchema, publicationSchema } from "./schemas";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: projectSchema,
});

const publications = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/publications" }),
  schema: publicationSchema,
});

export const collections = { projects, publications };
