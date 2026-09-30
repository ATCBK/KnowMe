import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type Lang = "zh" | "en";

export interface Profile {
  name: string;
  title: string;
  location?: string;
  email?: string;
  github?: string;
  body: string;
}

export interface Post {
  slug: string;
  title: string;
  date: string;
  summary: string;
  lang: Lang;
  body: string;
}

function read(file: string): string {
  return fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
}

export function getProfile(): Profile {
  const { data, content } = matter(read("profile.md"));
  return {
    name: data.name ?? "Me",
    title: data.title ?? "",
    location: data.location,
    email: data.email,
    github: data.github,
    body: content.trim(),
  };
}

export function getResume(): { title: string; updated?: string; body: string } {
  const { data, content } = matter(read("resume.md"));
  return { title: data.title ?? "Résumé", updated: data.updated, body: content.trim() };
}

export function getPosts(): Post[] {
  const dir = path.join(CONTENT_DIR, "posts");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
      return {
        slug: f.replace(/\.md$/, ""),
        title: data.title ?? f,
        date: data.date ?? "",
        summary: data.summary ?? "",
        lang: (data.lang === "en" ? "en" : "zh") as Lang,
        body: content.trim(),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((p) => p.slug === slug);
}
