"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang-context";

export default function Nav({ name }: { name: string }) {
  const { t, lang, setLang } = useLang();
  const path = usePathname();

  const links = [
    { href: "/", label: t.nav_home },
    { href: "/blog", label: t.nav_blog },
    { href: "/resume", label: t.nav_resume },
    { href: "/chat", label: t.nav_chat },
  ];

  return (
    <nav className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          {name}
        </Link>
        <div className="flex items-center gap-1 text-sm">
          {links.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 transition ${
                  active
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <button
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
            className="ml-2 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Switch language"
          >
            {t.lang_switch}
          </button>
        </div>
      </div>
    </nav>
  );
}
