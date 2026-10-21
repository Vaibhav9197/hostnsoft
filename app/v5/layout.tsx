import { LANDING_METADATA } from "@/app/lib/landingMetadata";

// Built to be served as `/` once it joins the split test, so it carries the
// homepage's metadata. See app/lib/landingMetadata.ts for why every arm shares
// one object.
export const metadata = LANDING_METADATA;

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
