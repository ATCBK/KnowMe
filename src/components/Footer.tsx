"use client";

import { useLang } from "@/lib/lang-context";

export default function Footer({ github }: { github?: string }) {
  const { t } = useLang();
  return (
    <footer className="mt-16 border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
      {t.footer}{" "}
      <a
        href={github ? `${github.replace(/\/$/, "")}/KnowMe` : "https://github.com/ATCBK/KnowMe"}
        className="underline hover:text-zinc-800 dark:hover:text-zinc-200"
        target="_blank"
        rel="noreferrer"
      >
        GitHub
      </a>
    </footer>
  );
}
