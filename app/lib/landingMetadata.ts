import type { Metadata } from "next";

/**
 * The homepage's metadata, shared by every landing-page arm.
 *
 * `/` is rewritten by middleware to one of /v1../v4, so whatever <head> a
 * crawler receives for the homepage comes from whichever arm it was bucketed
 * into. Before this lived here, three arms fell back to the root layout's
 * generic title and one had its own, so Google saw the site's most important
 * page under two different titles across crawls. One object, imported by all
 * four layouts, keeps the homepage's identity stable no matter which arm wins
 * the bucket.
 *
 * `absolute` opts out of the root layout's "%s · Embarko" template: the brand
 * is already the first word here.
 */
export const LANDING_METADATA: Metadata = {
  title: { absolute: "Embarko — Instant hosting for every app you build with AI" },
  description:
    "Embarko gives the apps you build with AI a home online. Copy one prompt, paste it into your AI agent, and get a live URL with a database and storage built in.",
  keywords: ["AI app hosting", "AI agent deployment", "deploy apps built with AI", "Embarko"],
  openGraph: {
    type: "website",
    siteName: "Embarko",
    title: "Instant hosting for every app you build with AI",
    description: "Copy one prompt and ask your agent to deploy.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Instant hosting for every app you build with AI",
    description: "Copy one prompt and ask your agent to deploy.",
  },
};
