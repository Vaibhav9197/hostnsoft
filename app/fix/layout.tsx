import type { Metadata } from "next";

import { THEME_SCRIPT } from "../lib/themeScript";
import { ThemeProvider } from "../lib/theme";

/* Reached only from a "Fix with your AI" button in an alert email, so never
   indexed: the page carries one app's fix prompt and means nothing to anyone
   else. */
export const metadata: Metadata = {
  title: "Fix with your AI",
  description: "Copy the prompt that lets your AI fix your Embarko app.",
  robots: { index: false, follow: false },
};

export default function FixLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <ThemeProvider>{children}</ThemeProvider>
    </>
  );
}
