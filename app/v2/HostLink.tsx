'use client';

import { Check } from 'lucide-react';
import { CopyPromptButton, PromptIcon } from '../components/CopyPromptButton';
import { trackCTA } from '../lib/tracking';

/* "Host your app" as a quiet link: copies the deploy prompt. Used under the
   hero's "How it works?" and at the foot of every story scene, so anyone
   who's already convinced can leave the story and start. */
export function HostLink() {
  return (
    <CopyPromptButton
      onClicked={() => trackCTA('copy')}
      copiedChildren={<><Check className="size-3.5" aria-hidden="true" />Prompt copied. Paste in your AI</>}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--ds-mute)] underline decoration-[color:var(--ds-line2)] underline-offset-4 transition-colors hover:text-[color:var(--ds-ink)] hover:decoration-[color:var(--ds-ink)]"
    >
      <PromptIcon className="size-3.5" aria-hidden="true" />
      Host your app
    </CopyPromptButton>
  );
}
