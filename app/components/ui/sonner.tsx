"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useTheme } from "@/app/lib/theme";

/**
 * Toasts for the console.
 *
 * Sonner is handed the console's own resolved theme rather than left to read
 * the OS: the preference here is three-way and can disagree with what the
 * system reports, and a toast on the wrong ground is the one thing on screen
 * that looks like it came from another site.
 *
 * Success and failure are tinted, but only the background, border and icon —
 * the words stay on the normal ink. Green text on a green ground measures
 * 2.8:1, which fails AA; --ink on the same tint clears 15:1. Colour and icon
 * carry the meaning, type carries the message, which is also what keeps the
 * two states apart for a reader who cannot separate red from green.
 *
 * The tints are mixed against --surface rather than layered as translucent
 * overlays, so a toast never shows the page through itself, and both themes
 * get the tint from the same declaration.
 */
export function Toaster(props: ToasterProps) {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="bottom-left"
      /* Required for the tinted states below to apply at all: without it
         Sonner ignores the success/error variables and paints every toast on
         the neutral ground. */
      richColors
      /* Long enough to read a sentence without chasing it. Errors override
         this at the call site when the reader has to act on one. */
      duration={5000}
      toastOptions={{
        classNames: {
          toast: "font-sans",
          description: "text-muted-foreground",
          /* The words stay on --ink for contrast, so the tick and the cross are
             what carry the colour. Targeted through the toast because Sonner
             has no class slot for an icon. */
          success: "[&_[data-icon]]:text-[var(--ok)]",
          error: "[&_[data-icon]]:text-[var(--danger)]",
        },
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--line-strong)",

          /* 8%, not more: at 12% the muted description text drops to 4.4:1 on
             the red tint, just under AA. */
          "--success-bg": "color-mix(in srgb, var(--ok) 8%, var(--surface))",
          "--success-text": "var(--ink)",
          "--success-border": "color-mix(in srgb, var(--ok) 32%, var(--surface))",

          "--error-bg": "color-mix(in srgb, var(--danger) 8%, var(--surface))",
          "--error-text": "var(--ink)",
          "--error-border": "color-mix(in srgb, var(--danger) 32%, var(--surface))",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
