import { LANDING_METADATA } from "@/app/lib/landingMetadata";
import "./v4.css";

/* v4 now uses the site fonts and the ds design layer (docs/DESIGN.md), so the
   wrapper only scopes v4.css to this route. */

// Shared with the other arms — see app/lib/landingMetadata.ts.
export const metadata = LANDING_METADATA;

export default function V4Layout({ children }: { children: React.ReactNode }) {
  return <div className="v4-root antialiased">{children}</div>;
}
