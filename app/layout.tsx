import type { Metadata } from "next";
import "./base.css";

export const metadata: Metadata = {
  title: "hostnsoft — Deploy any app. Get a live URL.",
  description:
    "Managed hosting that builds your app automatically — no Dockerfile, no config. Deploy from your terminal or your AI agent, and get a live URL with a database and persistent storage built in.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
