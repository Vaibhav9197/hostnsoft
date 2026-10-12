"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { DeploySteps } from "./DeploySteps";

type Answer = "new" | "keep";

/**
 * The dashboard with no apps yet. Two kinds of people land here: someone new,
 * and someone whose AI already deployed an app before they signed in — an app
 * that is deleted after 24 hours unless it moves into their account.
 *
 * The page can't tell them apart, so it asks — one plain question — and each
 * answer leads to the same four steps as the Host new app dialog
 * (DeploySteps), so getting an app online reads the same wherever it starts:
 * - new: the key is optional, as in the dialog;
 * - keep: the key is required — keeping the app is a redeploy with this
 *   account's key, so there is no prompt without one.
 *
 * After the copy the steps show the deploy's state. Once the app is live,
 * "Go to your apps" calls `onLive`: the page re-reads its list, and the
 * app's card replaces this.
 */
export function FirstAppEmpty({ onLive }: { onLive: () => void }) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  /* The state view has its own way back; one Back link at a time. */
  const [tracking, setTracking] = useState(false);

  const primary =
    "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-70";
  const secondary =
    "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-control px-5 text-sm font-semibold text-foreground hover:bg-accent";

  /* ------------------------------------------------------------- question */
  if (!answer) {
    return (
      <div className="rounded-xl bg-card/50 px-6 py-14 text-center">
        <h3 className="text-[1.1rem] font-bold text-foreground">Did you deploy an app without signing in?</h3>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" onClick={() => setAnswer("new")} className={primary}>
            No, I’m new
          </button>
          <button type="button" onClick={() => setAnswer("keep")} className={secondary}>
            Yes
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- steps */
  return (
    <div className="rounded-xl bg-card/50 px-6 py-12">
      <div className="mx-auto max-w-md">
        <h3 className="text-2xl font-extrabold leading-none text-foreground">
          {answer === "new" ? "Deploy your first app" : "Keep that app"}
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {answer === "new"
            ? "Your AI built the app. Let it put the app online too."
            : "It’s deleted 24 hours after it was deployed, unless you move it into your account."}
        </p>
        <div className="mt-6">
          <DeploySteps
            /* Remount on a change of answer: a fresh set of steps, no watch
               carried over from the other path. */
            key={answer}
            mode={answer}
            onTrackingChange={setTracking}
            /* Live replaces this page with the app's card, so it waits for
               the person: the Live moment and Open app come first. */
            doneAction={{ label: "Go to your apps", onClick: onLive }}
          />
        </div>
        {!tracking && (
          <button
            type="button"
            onClick={() => setAnswer(null)}
            className="mt-8 inline-flex items-center gap-1.5 text-[0.84rem] text-muted-foreground hover:text-foreground hover:underline"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {answer === "new" ? "Back" : "Not sure? Start over"}
          </button>
        )}
      </div>
    </div>
  );
}
