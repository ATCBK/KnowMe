import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/shaders/threeui.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Agent",
  description: "A personal resume and interview Q&A agent.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
