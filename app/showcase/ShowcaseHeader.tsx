"use client";

import { Check } from "lucide-react";
import { SiteHeader } from "../components/SiteHeader";
import { CopyPromptButton, PromptIcon } from "../components/CopyPromptButton";
import { buttonClass } from "../components/ds";
import { showcaseGeneralPrompt } from "../lib/showcasePrompt";
import { trackCTA } from "../lib/tracking";

/**
 * The Showcase's header: wordmark and one action. Browsing apps is the whole
 * page, so the site links step aside for the thing a visitor here does next.
 * "List your app here" copies the listing prompt — the visitor's AI does the
 * listing. `prompt` overrides the general one — an event page passes its
 * own, so the app lands on that page.
 */
export function ShowcaseHeader({ prompt }: { prompt?: string }) {
  return (
    <SiteHeader
      cta={
        <CopyPromptButton
          text={prompt ?? showcaseGeneralPrompt()}
          onClicked={() => trackCTA("copy")}
          className={buttonClass("primary", "sm")}
          copiedChildren={
            <>
              <Check className="size-3.5" aria-hidden="true" />
              Prompt copied. Paste in your AI
            </>
          }
        >
          <PromptIcon className="size-3.5" aria-hidden="true" />
          List your app here
        </CopyPromptButton>
      }
    />
  );
}
