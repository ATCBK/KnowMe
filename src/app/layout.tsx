import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LangProvider } from "@/lib/lang-context";
import { getProfile } from "@/lib/content";

export function generateMetadata(): Metadata {
  const profile = getProfile();
  return {
    title: profile.name,
    description: profile.title,
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
