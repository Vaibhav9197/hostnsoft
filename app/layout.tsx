import type { Metadata } from "next";
import "./base.css";
import { GoogleTagManager, GoogleTagManagerNoScript } from "./components/analytics/GoogleTagManager";
import { PageViewTracker } from "./components/analytics/PageViewTracker";
import { ConnectorTokenPickup } from "./components/connector/ConnectorTokenPickup";

export const metadata: Metadata = {
  title: "Embarko — Deploy any app. Get a live URL.",
  description:
    "Managed hosting that builds your app automatically — no Dockerfile, no config. Deploy from your terminal or your AI agent, and get a live URL with a database and persistent storage built in.",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <GoogleTagManager />
      </head>
      <body>
        <GoogleTagManagerNoScript />
        <PageViewTracker />
        <ConnectorTokenPickup />
        {children}
      </body>
    </html>
  );
}
