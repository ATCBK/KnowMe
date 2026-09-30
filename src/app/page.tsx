import Link from "next/link";
import { getPosts, getProfile } from "@/lib/content";
import Chat from "@/components/Chat";
import HeroHint from "@/components/HeroHint";

export default function Home() {
  const p = getProfile();
  const posts = getPosts().slice(0, 3);

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{p.name}</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">{p.title}</p>
        <HeroHint />
        <div className="flex gap-3 text-sm text-zinc-500">
          {p.location && <span>{p.location}</span>}
          {p.github && (
            <a href={p.github} target="_blank" rel="noreferrer" className="underline">
              GitHub
            </a>
          )}
          {p.email && (
            <a href={`mailto:${p.email}`} className="underline">
              Email
            </a>
          )}
        </div>
      </section>

      <Chat compact />

      {posts.length > 0 && (
        <section className="space-y-4">
          <ul className="space-y-3">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  <span className="text-xs text-zinc-500">{post.date}</span>
                  <h3 className="font-medium group-hover:underline">{post.title}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{post.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
