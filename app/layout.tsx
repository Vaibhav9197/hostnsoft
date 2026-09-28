import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import "./base.css";
import "./design.css";
import { GoogleTagManager, GoogleTagManagerNoScript } from "./components/analytics/GoogleTagManager";
import { PageViewTracker } from "./components/analytics/PageViewTracker";
import { ConnectorTokenPickup } from "./components/connector/ConnectorTokenPickup";
import { SITE } from "./lib/site";
import { BetaBanner } from "./components/BetaBanner";

/** The default link-preview card, 1200×630. */
const OG_IMAGE = {
  url: "/assets/opengraph.png",
  width: 1200,
  height: 630,
  alt: "Embarko — Instant hosting for every app you build with AI",
};

export const metadata: Metadata = {
  // Resolves every relative URL in this metadata — including the canonical
  // below and any Open Graph image — against the live origin, so crawlers and
  // link unfurlers never receive a bare path they cannot fetch.
  metadataBase: new URL(SITE),
  // Each page declares itself the canonical version of its own URL. Without
  // this, the same page reached with a tracking parameter or a trailing slash
  // can be treated as a separate, competing URL.
  alternates: { canonical: "./" },
  // Every page names itself ("Pricing", "Security") and the template adds the
  // brand, so search results read consistently across the site. Before this,
  // pages spelled it three ways — "X | Embarko", "X — Embarko", or no brand.
  // The homepage opts out with an absolute title, since it leads with the brand.
  title: {
    default: "Embarko — Deploy any app. Get a live URL.",
    template: "%s · Embarko",
  },
  description:
    "Managed hosting that builds your app automatically — no Dockerfile, no config. Deploy from your terminal or your AI agent, and get a live URL with a database and persistent storage built in.",
  // Defaults for link previews on every page that does not set its own. The
  // card is a committed PNG, not a generated route: production is a Cloudflare
  // Worker with no filesystem and no incremental cache, so a build-time
  // `opengraph-image.tsx` was re-rendered on every request there and failed
  // with a 500. A file under public/ is served as a static asset and cannot.
  // Pages that set openGraph replace this whole block, so the homepage repeats
  // it in app/lib/landingMetadata.ts.
  openGraph: { type: "website", siteName: "Embarko", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", images: [OG_IMAGE] },
  // Site-wide terms; pages with a sharper topic set their own list, which
  // replaces this one. Google ignores this tag, but Bing and others still read
  // it, and it costs nothing.
  keywords: [
    "Embarko",
    "AI app hosting",
    "deploy AI generated apps",
    "hosting for AI agents",
    "instant app deployment",
    "managed hosting with database",
    "get a live URL",
  ],
  applicationName: "Embarko",
  authors: [{ name: "Embarko", url: SITE }],
  creator: "Embarko",
  publisher: "Embarko",
  category: "technology",
  // Explicit rather than assumed: index everything public, and let Google show
  // full-size image previews and long snippets in results.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Stops mobile browsers turning digits in prose into phone links.
  formatDetection: { telephone: false },
  // The generated icon set lives under /public/assets rather than at the root,
  // so it has to be declared here — Next's app/favicon.ico convention won't
  // pick it up. Declaring it on the root layout covers the console too, which
  // has no metadata of its own.
  icons: {
    icon: [
      { url: "/assets/favicon.ico", sizes: "any" },
      { url: "/assets/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/assets/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/assets/apple-touch-icon.png",
  },
  manifest: "/assets/site.webmanifest",
};

/* Site-wide structured data. Organization is what lets Google attach the logo
   and name to results for the brand; SoftwareApplication describes the product
   and that it can be started for free. Emitted once here rather than per page:
   it is true on every page, and a per-arm copy on the landing pages meant
   three of the four arms had none. */
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "Embarko",
      url: SITE,
      logo: `${SITE}/assets/android-chrome-512x512.png`,
    },
    {
      "@type": "SoftwareApplication",
      name: "Embarko",
      url: SITE,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      description: "Instant hosting for every app you build with AI.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": `${SITE}/#organization` },
    },
  ],
};

/* The serif accent of the design layer (docs/DESIGN.md): one italic word per
   headline. Exposed as --font-ds-serif on <html> so every route can use it. */
const serif = Instrument_Serif({
  variable: "--font-ds-serif",
  weight: "400",
  style: "italic",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* The console's theme script sets data-theme on this element before React
       hydrates, so the client DOM deliberately differs from the server HTML
       here. Suppression is one level deep — it covers this element's own
       attributes, not the tree inside it — which is exactly the scope of the
       difference. Without it React warns on every console page load. */
    <html lang="en" className={serif.variable} suppressHydrationWarning>
      <head>
        <GoogleTagManager />
      </head>
      <body>
        <BetaBanner />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        <GoogleTagManagerNoScript />
        <PageViewTracker />
        <ConnectorTokenPickup />
        {children}
      </body>
    </html>
  );
}
