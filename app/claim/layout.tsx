import type { Metadata } from "next";

import { THEME_SCRIPT } from "../lib/themeScript";
import { ClaimShell } from "./ClaimShell";

/* Reached only from a claim link, so never indexed: the page is for one
   person and one app, and means nothing to anyone else. */
export const metadata: Metadata = {
  title: "Keep your app",
  description: "Sign in to keep an app deployed to Embarko without an account.",
  robots: { index: false, follow: false },
};

export default function ClaimLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <ClaimShell>{children}</ClaimShell>
    </>
  );
}
