"use client";

import { useEffect, useState } from "react";

import { CustomHtml } from "@/app/components/CustomHtml";
import { cn } from "@/app/lib/utils";

/**
 * The HTML box on the event page create form: a monospace textarea and,
 * once there is something in it, a
 * live preview drawn by the same sandboxed frame the public page uses. What
 * the organiser sees here is what visitors get.
 */

/** Matches CUSTOM_HTML_MAX in hostnsoft-api's services/showcase.ts. */
export const CUSTOM_HTML_MAX = 50_000;
/* The counter appears only near the limit; before that it's noise. */
const COUNT_FROM = 45_000;
/* Re-rendering the frame on every keystroke flickers; wait for a pause. */
const PREVIEW_SETTLE_MS = 300;

/** Showcase pages are light-only, so a preview sits on their cream page and
    ink (app/base.css light tokens) even when the console is dark — otherwise
    it would show colours visitors never see. */
export const PUBLIC_PAGE_SURFACE = "bg-[#f5f4f0] text-[#1a1916] [color-scheme:light]";

const PLACEHOLDER = `<section>
  <h2>Rules</h2>
  <ul>
    <li>Teams of up to 4.</li>
    <li>Add your app before Sunday 6 pm.</li>
  </ul>
</section>`;

export function CustomHtmlField({
  id,
  value,
  onChange,
  readOnly,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
}) {
  const [preview, setPreview] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setPreview(value), PREVIEW_SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [value]);
  const shown = preview.trim();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-[0.86rem] font-medium text-foreground">
            Custom HTML<span className="font-normal text-muted-foreground"> (optional)</span>
          </label>
          {value.length >= COUNT_FROM && (
            <span className="text-[0.8rem] tabular-nums text-faint">
              {(CUSTOM_HTML_MAX - value.length).toLocaleString()} left
            </span>
          )}
        </div>
        <textarea
          id={id}
          rows={10}
          maxLength={CUSTOM_HTML_MAX}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          autoFocus={autoFocus}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          placeholder={PLACEHOLDER}
          aria-describedby={`${id}-help`}
          className={cn(
            "mt-1.5 block w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-[0.8rem] leading-relaxed text-foreground shadow-sm outline-none",
            "transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--accent)_50%,transparent)] motion-reduce:transition-none dark:bg-input/30",
          )}
        />
        <p id={`${id}-help`} className="mt-1.5 text-[0.8rem] leading-relaxed text-muted-foreground">
          Shown on your page above the apps: rules, a schedule, sponsors. Headings, text, lists, links, images and
          styles work. Scripts don’t run, so forms and embedded players won’t either.
        </p>
      </div>

      {shown && (
        <div>
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.1em] text-faint">Preview</p>
          <div className={cn("mt-1.5 max-h-[420px] overflow-auto rounded-md border border-dashed border-border p-3", PUBLIC_PAGE_SURFACE)}>
            <CustomHtml html={shown} title="Preview of your custom HTML" className="block w-full border-0 bg-transparent" lazy={false} />
          </div>
        </div>
      )}
    </div>
  );
}
