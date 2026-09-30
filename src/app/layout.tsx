import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LangProvider } from "@/lib/lang-context";
import { getProfile } from "@/lib/content";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export function generateMetadata(): Metadata {
  const p = getProfile();
  return {
    title: { default: p.name, template: `%s · ${p.name}` },
    description: p.title,
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const p = getProfile();
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <LangProvider>
          <Nav name={p.name} />
          <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">{children}</main>
          <Footer github={p.github} />
        </LangProvider>
      </body>
    </html>
  );
}
