import type { Metadata } from "next";
import { DocView } from "./DocView";
import { extractToc, fetchDocs } from "../lib/docs";

export const metadata: Metadata = {
  title: "Documentation — Embarko",
  description: "How to deploy an app to Embarko and manage it once it's live.",
};

// A server component on purpose: the docs endpoint only allows CORS from
// embarko.ai, so the markdown has to be fetched here, not in the browser.
// fetchDocs caches it, so this doesn't hit upstream on every request.
export default async function DocPage() {
  const markdown = await fetchDocs();
  const toc = markdown ? extractToc(markdown) : [];

  return <DocView markdown={markdown} toc={toc} />;
}
