"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/** What the user picked. "system" defers to the OS, and keeps deferring — it
 *  is not resolved once and frozen. */
export type ThemePref = "light" | "dark" | "system";
/** What is actually on screen. Always concrete. */
export type Theme = "light" | "dark";

export const THEME_KEY = "embarko-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function storedPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    // Private mode / blocked storage. Defaulting to "system" is the right
    // fallback anyway, so there is nothing to report.
    return "system";
  }
}

type ThemeValue = { pref: ThemePref; theme: Theme; setPref: (p: ThemePref) => void };

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Theme state for the console.
 *
 * Only the resolved value reaches the DOM, as `data-theme` on <html>: CSS keys
 * off that, and so does Tailwind's `dark:` variant. The three-way preference
 * stays in JS, which is the only place that needs to know the difference
 * between "dark" and "system that happens to be dark".
 *
 * The attribute is scoped to the console on purpose — it's removed on unmount
 * so a client-side navigation out to the marketing pages, which are designed
 * for the cream ground only, doesn't leave them dark.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  /* Two independent facts, kept separate on purpose, with the visible theme
     derived from them rather than stored alongside them.

     An earlier version kept `theme` in its own state and wrote to it from both
     the "read storage" effect and the "watch the OS" effect. On mount both ran
     in the same commit while pref was still the default "system", so the OS
     watcher's write landed last and overwrote the stored preference — a saved
     "dark" came back as light until something else forced a re-render. */
  const [pref, setPrefState] = useState<ThemePref>("system");
  const [systemIsDark, setSystemIsDark] = useState(false);

  const theme: Theme = pref === "system" ? (systemIsDark ? "dark" : "light") : pref;

  useEffect(() => {
    setPrefState(storedPref());
  }, []);

  /* Tracked unconditionally, not just while pref is "system": the listener is
     cheap, and keeping it always-on means switching back to System shows the
     right theme immediately instead of after the next OS change. */
  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY);
    const sync = () => setSystemIsDark(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    return () => document.documentElement.removeAttribute("data-theme");
  }, [theme]);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    try {
      localStorage.setItem(THEME_KEY, p);
    } catch {
      // Storage unavailable — the choice still applies for this session.
    }
  }, []);

  return <ThemeContext.Provider value={{ pref, theme, setPref }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside a ThemeProvider");
  return ctx;
}
