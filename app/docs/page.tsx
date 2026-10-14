import type { Metadata } from "next";
import { guideMetadata, renderGuidePage } from "./renderDoc";

/* /docs opens on the quickstart, with the guide's contents in the sidebar.
   An agent asking for Markdown or JSON never reaches this page: middleware
   hands it /docs/index.md or /docs/index.json instead. */
export const metadata: Metadata = {
  ...guideMetadata("quickstart"),
  title: "Agent guide: deploy, keep and manage AI-built apps",
  description:
    "How AI agents deploy apps to Embarko, keep them, manage them and list them on Showcase. Every page is also Markdown and JSON.",
  keywords: ["Embarko docs", "Embarko agent guide", "deploy app with AI agent", "AI app hosting docs"],
};

export default function DocsHome() {
  return renderGuidePage("quickstart", { home: true });
}
