import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/shaders/threeui.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mainframe® — Creative agency",
  description: "Mainframe is a creative agency for ideas with somewhere to go.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="stylesheet" href="https://db.onlinewebfonts.com/c/5ac3fe7c6abd2f62067f266d89671492?family=HelveticaNowDisplay-Medium" />
        <link rel="stylesheet" href="https://db.onlinewebfonts.com/c/1aa3377e489837a26d019bba501e779d?family=HelveticaNowDisplayW01-Rg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
