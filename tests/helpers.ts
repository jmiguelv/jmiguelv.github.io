import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface MarkdownFile {
  file: string;
  frontmatter: Record<string, unknown>;
}

export function loadMarkdownFiles(dir: string): MarkdownFile[] {
  const dirPath = path.resolve(dir);
  return fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({
      file: f,
      frontmatter: matter(fs.readFileSync(path.join(dirPath, f), "utf-8")).data,
    }));
}
