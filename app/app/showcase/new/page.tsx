"use client";

import { useState } from "react";

import { Page, PageHeader } from "@/app/components/console/kit";
import { PosterPreview } from "@/app/components/console/showcase/PosterPreview";

import { NewShowcaseForm, type ShowcaseDraft } from "./NewShowcaseForm";

/**
 * Create a showcase page (an event page): name, address, an optional line
 * about it. Nothing else is asked — there is no type to pick and nothing to
 * configure, because the page is useful the moment it exists.
 *
 * Beside the form, the page's poster draws itself from what is typed, with
 * the same renderer the download uses, so the person sees what they are
 * making before they make it. The preview is decoration for sighted users
 * only (the form is the source of truth), and is left out below md where
 * there is no room beside the fields.
 */
export default function NewShowcasePage() {
  const [draft, setDraft] = useState<ShowcaseDraft>({ title: "", intro: "", slug: "" });

  return (
    <Page>
      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          <PageHeader
            title="New event page"
            subtitle="For a hackathon, class or demo day. Anyone on Embarko can add their app to it."
          />
          <NewShowcaseForm onDraftChange={setDraft} />
        </div>

        <aside className="hidden md:block">
          <div className="sticky top-24 flex flex-col gap-3">
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.1em] text-faint">Poster preview</p>
            <div aria-hidden="true">
              <PosterPreview
                title={draft.title}
                intro={draft.intro}
                slug={draft.slug}
                mode="ghost"
                className="w-[300px]"
              />
            </div>
            <p className="text-[0.78rem] text-faint">Ready to download once your page is live.</p>
          </div>
        </aside>
      </div>
    </Page>
  );
}
