"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import type { Post } from "@/lib/content";

type PostMeta = Omit<Post, "body">;

export default function PostList({ posts }: { posts: PostMeta[] }) {
  const { t, lang } = useLang();
  // Show posts in the current language first, then the rest.
  const sorted = [...posts].sort((a, b) => Number(b.lang === lang) - Number(a.lang === lang));

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">{t.blog_title}</h1>
      {sorted.length === 0 ? (
        <p className="text-zinc-500">{t.blog_empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {sorted.map((p) => (
            <li key={p.slug} className="py-5">
              <Link href={`/blog/${p.slug}`} className="group block space-y-1">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{p.date}</span>
                  <span className="rounded border border-zinc-300 px-1.5 py-0.5 uppercase dark:border-zinc-700">
                    {p.lang}
                  </span>
                </div>
                <h2 className="text-lg font-medium group-hover:underline">{p.title}</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{p.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
