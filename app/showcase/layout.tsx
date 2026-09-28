import { Instrument_Serif } from "next/font/google";
import "./showcase.css";

/* The serif accent the Showcase design uses for single words ("Live", "by",
   pull quotes). Hung off a wrapper, the same way app/v4/layout.tsx does it,
   so the font and showcase.css stay on these routes only. No metadata here:
   each page sets its own (docs/SEO.md). */
const serif = Instrument_Serif({
  variable: "--font-sc-serif",
  weight: "400",
  style: "italic",
  subsets: ["latin"],
});

export default function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  return <div className={`sc ${serif.variable}`}>{children}</div>;
}
