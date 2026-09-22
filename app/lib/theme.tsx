"use client";

import { createContext, useContext, useEffect, useState } from "react";

/** What is on screen. Always concrete, and always whatever the OS is set to. */
export type Theme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

type ThemeValue = { theme: Theme };

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Theme state for the console.
 *
 * The OS decides, and there is no in-app picker: a per-app override is one more
 * thing to find, to get wrong, and to explain, and every platform already has
 * this setting in one place people know about. Nothing is stored, so there is
 * no stale preference to fight with the OS either.
 *
 * The resolved value reaches the DOM as `data-theme` on <html>: CSS keys off
 * that, and so does Tailwind's `dark:` variant.
 *
 * The attribute is scoped to the console on purpose — it's removed on unmount
 * so a client-side navigation out to the marketing pages, which are designed
 * for the cream ground only, doesn't leave them dark.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  /* Starts light and corrects itself on mount rather than reading the media
     query during render: the server has no OS to ask, and rendering one answer
     on the server and another on the client is a hydration mismatch. */
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY);
    const sync = () => setTheme(mq.matches ? "dark" : "light");
    sync();
    /* Kept listening, not read once: someone whose OS is on a schedule gets the
       switch as it happens rather than at their next page load. */
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    return () => document.documentElement.removeAttribute("data-theme");
  }, [theme]);

  return <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside a ThemeProvider");
  return ctx;
}
