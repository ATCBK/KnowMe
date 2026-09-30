import type { Metadata } from "next";
import { getResume } from "@/lib/content";
import Markdown from "@/components/Markdown";

export const metadata: Metadata = { title: "Résumé" };

export default function ResumePage() {
  const r = getResume();
  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{r.title}</h1>
        {r.updated && <p className="mt-1 text-sm text-zinc-500">{r.updated}</p>}
      </header>
      <Markdown>{r.body}</Markdown>
    </article>
  );
}
