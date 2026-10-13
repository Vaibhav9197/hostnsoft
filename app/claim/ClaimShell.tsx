"use client";

import { SessionProvider } from "../lib/session";
import { ThemeProvider } from "../lib/theme";

/* The session and theme the console runs on, without the console around
   them. /claim lives outside /app on purpose: the console shell turns every
   signed-out visitor into its sign-in wall and every signed-in one into the
   apps list, and this page needs to show "Keep my-app" to both before either
   of those happens. SessionProvider still does the one thing the page can't
   do itself — it turns the token MSG91 appends to the URL on its redirect
   variant into a session. */
export function ClaimShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>{children}</SessionProvider>
    </ThemeProvider>
  );
}
