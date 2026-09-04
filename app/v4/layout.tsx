import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./v4.css";

/* The source project loaded these in its own root layout and hung the font
   variables off <body>. This repo already owns <html>/<body> in app/layout.tsx,
   so the variables go on a wrapper element that only exists on this route —
   which is also what keeps v4.css from leaking into the other variants. */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Embarko — Instant hosting for every app you build with AI",
  description:
    "Embarko gives the apps you build with AI a home online. Copy one prompt and ask your agent to deploy.",
  keywords: ["AI app hosting", "AI agent deployment", "deploy apps built with AI", "Embarko"],
  openGraph: {
    type: "website",
    siteName: "Embarko",
    title: "Instant hosting for every app you build with AI",
    description: "Copy one prompt and ask your agent to deploy.",
  },
  twitter: {
    card: "summary",
    title: "Instant hosting for every app you build with AI",
    description: "Copy one prompt and ask your agent to deploy.",
  },
};

export default function V4Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`v4-root ${geistSans.variable} ${geistMono.variable} antialiased`}>
      {children}
    </div>
  );
}
