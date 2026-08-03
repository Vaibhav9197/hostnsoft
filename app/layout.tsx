import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "hostnsoft — Turn AI-made apps into tools your whole business runs on",
  description:
    "Drop a folder of files or describe an app, and get a live, shareable URL — with database, auth, AI, file storage, payments, and realtime already wired in. No servers, no config, no code.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
