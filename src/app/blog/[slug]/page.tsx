import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost, getPosts } from "@/lib/content";
import Markdown from "@/components/Markdown";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  return post ? { title: post.title, description: post.summary } : {};
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500">{post.date}</p>
        <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
        {post.summary && <p className="text-zinc-600 dark:text-zinc-400">{post.summary}</p>}
      </header>
      <Markdown>{post.body}</Markdown>
    </article>
  );
}
