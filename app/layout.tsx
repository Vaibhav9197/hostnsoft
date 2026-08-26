import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "hostnsoft — Deploy any app. Get a live URL.",
  description:
    "Managed hosting that builds your app automatically — no Dockerfile, no config. Deploy from your terminal or your AI agent, and get a live URL with a database and persistent storage built in.",
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
