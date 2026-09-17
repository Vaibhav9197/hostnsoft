import { LANDING_METADATA } from "@/app/lib/landingMetadata";
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

// Shared with the other arms — see app/lib/landingMetadata.ts.
export const metadata = LANDING_METADATA;

export default function V4Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`v4-root ${geistSans.variable} ${geistMono.variable} antialiased`}>
      {children}
    </div>
  );
}
