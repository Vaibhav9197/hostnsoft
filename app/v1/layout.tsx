import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./apphome.css";

const serif = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AppHome — The production home for AI-built apps",
  description:
    "Bring an app from Claude Code, Cursor, Lovable — or a ZIP. AppHome gives it a real login, a real database, real users and roles, and a URL your team can bookmark. In 15 minutes.",
};

export default function AppHomeLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${serif.variable} ${sans.variable}`}>{children}</div>;
}
