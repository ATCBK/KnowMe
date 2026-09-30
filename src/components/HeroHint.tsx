"use client";

import { useLang } from "@/lib/lang-context";

export default function HeroHint() {
  const { t } = useLang();
  return <p className="text-zinc-500">{t.hero_hint}</p>;
}
