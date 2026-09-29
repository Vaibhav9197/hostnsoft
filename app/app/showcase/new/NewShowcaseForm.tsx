"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Alert, LinkButton, Panel } from "@/app/components/console/kit";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { HnsError } from "@/app/lib/client";
import { showcaseApi } from "@/app/lib/hnsApi";
import { useSession } from "@/app/lib/session";
import {
  finalizeSlug,
  isReserved,
  isValidSlug,
  normalizeWhileTyping,
  SLUG_MAX,
  slugFromName,
  suggestionCandidates,
} from "@/app/lib/showcaseAddress";
import { SITE_HOST } from "@/app/lib/site";
import { cn } from "@/app/lib/utils";

/**
 * The create form for an event page.
 *
 * The address makes itself: it follows the name ("Indore AI Hack Day" →
 * indore-ai-hack-day) until the person types in it, and checks itself a
 * moment after they stop typing. If it is taken, the form looks for a free
 * variant and offers it as one tap. The only thing that ever blocks Create
 * is something the person can fix from what's on screen — a blank name, an
 * address that's too short, reserved, or known to be taken. A check that is
 * still running, or one that failed, never holds them up: the server has
 * the last word, and a clash there lands back here as "Taken".
 */

/** What the poster beside the form draws. */
export type ShowcaseDraft = { title: string; intro: string; slug: string };

const NAME_MAX = 80;
const INTRO_MAX = 200;
/* Counters appear only near the limit; before that they're noise. */
const NAME_COUNT_FROM = 70;
const INTRO_COUNT_FROM = 160;
/** Quiet time after the last keystroke before the address is judged. */
const SETTLE_MS = 400;
/** A lookup faster than this never shows "Checking…" at all. */
const SLOW_MS = 150;

type Lookup = "available" | "taken" | "error";
type Status = "reserved" | "checking" | "available" | "taken" | null;

const is404 = (e: unknown) => e instanceof HnsError && e.status === 404;

const LABEL = "text-[0.86rem] font-medium text-foreground";
const HELP = "text-[0.8rem] leading-relaxed text-muted-foreground";
const COUNT = "text-[0.8rem] tabular-nums text-faint";

export function NewShowcaseForm({ onDraftChange }: { onDraftChange?: (draft: ShowcaseDraft) => void }) {
  const router = useRouter();
  const { activeCompanyId } = useSession();
  const ids = useId();
  const nameId = `${ids}-name`;
  const addressId = `${ids}-address`;
  const introId = `${ids}-intro`;

  const nameRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [intro, setIntro] = useState("");
  /* The address follows the name until the person types in it. `typed` only
     means something while `follow` is off. */
  const [follow, setFollow] = useState(true);
  const [typed, setTyped] = useState("");
  const [addressEdited, setAddressEdited] = useState(false);
  /* Set by the first Create press: from then on problems show at once. */
  const [tried, setTried] = useState(false);
  const [nameMissing, setNameMissing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const derived = slugFromName(name);
  const address = follow ? derived : typed;
  const final = finalizeSlug(address);

  /* The address once typing has paused. Judging it on every keystroke would
     flash "Reserved" at "app" on the way to "apple". */
  const [settled, setSettled] = useState(address);
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(address), SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [address]);
  const paused = settled === address;

  /* Every lookup answer, by address. Kept for the whole visit so going back
     to an address already checked is instant, and a suggestion that was
     found free shows "Available" the moment it's used. The ref mirrors the
     state for effects, which must not re-run each time an answer lands. */
  const [lookups, setLookups] = useState<Record<string, Lookup>>({});
  const lookupsRef = useRef(lookups);
  const remember = useCallback((slug: string, result: Lookup) => {
    lookupsRef.current = { ...lookupsRef.current, [slug]: result };
    setLookups(lookupsRef.current);
  }, []);
  /* The address whose lookup has run past SLOW_MS without an answer. */
  const [slowFor, setSlowFor] = useState<string | null>(null);

  useEffect(() => {
    const slug = settled;
    if (!isValidSlug(slug) || isReserved(slug)) return;
    const known = lookupsRef.current[slug];
    if (known === "available" || known === "taken") return;
    /* A check that failed before gets a fresh try, and shows as one. */
    if (known === "error") {
      const { [slug]: _failed, ...rest } = lookupsRef.current;
      lookupsRef.current = rest;
      setLookups(rest);
    }
    const slow = window.setTimeout(() => setSlowFor(slug), SLOW_MS);
    /* The answer is filed under its own address, so one that arrives after
       the person has moved on is kept but never shown for the new one. */
    showcaseApi
      .lookupPage(slug)
      .then(
        () => remember(slug, "taken"),
        (e) => remember(slug, is404(e) ? "available" : "error"),
      )
      .finally(() => window.clearTimeout(slow));
    return () => window.clearTimeout(slow);
  }, [settled, remember]);

  const reserved = isReserved(address);
  const checkable = isValidSlug(address) && !reserved;
  const result = checkable ? lookups[address] : undefined;
  const taken = result === "taken";

  /* A taken address gets up to three free variants tried, one after another;
     the first that's free is offered. null = none of them were. */
  const [suggestions, setSuggestions] = useState<Record<string, string | null>>({});
  const suggestionsRef = useRef(suggestions);
  const takenBase = taken ? address : null;
  useEffect(() => {
    const base = takenBase;
    if (!base || base in suggestionsRef.current) return;
    let cancelled = false;
    const offer = (value: string | null) => {
      if (cancelled) return;
      suggestionsRef.current = { ...suggestionsRef.current, [base]: value };
      setSuggestions(suggestionsRef.current);
    };
    (async () => {
      for (const candidate of suggestionCandidates(base, new Date().getFullYear())) {
        let r = lookupsRef.current[candidate];
        if (r !== "available" && r !== "taken") {
          try {
            await showcaseApi.lookupPage(candidate);
            r = "taken";
          } catch (e) {
            r = is404(e) ? "available" : "error";
          }
          remember(candidate, r);
        }
        if (cancelled) return;
        if (r === "available") return offer(candidate);
      }
      offer(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [takenBase, remember]);
  const suggestion = takenBase ? suggestions[takenBase] : undefined;

  /* Hand the poster what it needs. */
  useEffect(() => {
    onDraftChange?.({ title: name, intro, slug: final });
  }, [name, intro, final, onDraftChange]);

  /* ----------------------------------------------------------- judging */

  /* A Create press judges the address too — unless the name is still blank
     and the address was never touched: then it is empty only because the
     name is, and one error (the name's) says everything. */
  const addressTried = tried && (addressEdited || name.trim() !== "");
  const showReserved = reserved && (paused || addressTried);
  const noLatin = address === "" && name.trim() !== "" && derived === "";
  const tooShort = final.length < 3 && (addressEdited || addressTried) && (paused || addressTried);
  const checking = checkable && result === undefined && slowFor === address;
  const addressInvalid = showReserved || taken || tooShort || (addressTried && !isValidSlug(final));

  const status: Status = showReserved
    ? "reserved"
    : taken
      ? "taken"
      : result === "available"
        ? "available"
        : checking
          ? "checking"
          : null;

  let helper: React.ReactNode;
  if (showReserved) {
    helper = "That address is part of Embarko. Try another.";
  } else if (taken) {
    helper =
      suggestion === null ? (
        "Someone already uses this address. Try another."
      ) : (
        <>
          Someone already uses this address.
          {suggestion && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="max-w-full font-mono max-sm:h-11"
              onClick={() => applySuggestion(suggestion)}
            >
              <span className="truncate">Use {suggestion}</span>
            </Button>
          )}
        </>
      );
  } else if (noLatin) {
    helper = "Type an address using a–z, 0–9 and dashes.";
  } else if (tooShort) {
    helper = "Use at least 3 letters or numbers.";
  } else if (result === "error") {
    helper = "Couldn’t check the address. You can still create the page.";
  } else if (follow || final === derived) {
    helper = "Made from the name. Change it if you like.";
  } else {
    helper = "Letters, numbers and dashes.";
  }

  /* ----------------------------------------------------------- actions */

  function onAddressChange(raw: string) {
    setFollow(false);
    /* A pasted full link keeps only its address: embarko.ai/showcase/x → x. */
    setTyped(normalizeWhileTyping(raw.replace(/^.*\/showcase\//i, "")));
    setAddressEdited(true);
  }

  /* Tidy the address when the person leaves it. Left empty, it goes back to
     following the name — clearing it is how you say "make it for me". Done
     on blur rather than on the keystroke, so clearing the field to type a
     new address doesn't refill it under the cursor. */
  function onAddressBlur() {
    if (follow) return;
    const tidy = finalizeSlug(typed);
    if (tidy === "") setFollow(true);
    else setTyped(tidy);
  }

  function matchName() {
    setFollow(true);
    addressRef.current?.focus();
  }

  function applySuggestion(slug: string) {
    setFollow(false);
    setTyped(slug);
    addressRef.current?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setTried(true);
    setFormError(null);

    const title = name.trim();
    /* Cleared and submitted without leaving the field: an empty address
       means "make it from the name", the same as it does on blur. */
    const backToName = !follow && final === "";
    const slug = backToName ? derived : final;
    if (backToName) setFollow(true);
    else if (!follow) setTyped(slug);

    if (!title) {
      setNameMissing(true);
      nameRef.current?.focus();
      return;
    }
    /* Too short, reserved, or already known to be taken. A check still in
       flight doesn't count: Create goes ahead and the server decides. */
    if (!isValidSlug(slug) || isReserved(slug) || lookupsRef.current[slug] === "taken") {
      addressRef.current?.focus();
      return;
    }
    if (!activeCompanyId) {
      setFormError("Couldn’t create the page. Choose a workspace first.");
      return;
    }

    setCreating(true);
    try {
      const created = await showcaseApi.createCollection(activeCompanyId, {
        slug,
        title,
        intro: intro.trim() || null,
      });
      /* Stays on "Creating…" until the manage page takes over, so there is
         no moment where Create can be pressed twice. */
      router.replace(`/app/showcase/${created.id}?new=1`);
    } catch (err) {
      setCreating(false);
      if (err instanceof HnsError && err.code === "SHOWCASE_SLUG_TAKEN") {
        /* Someone got there first. Same as a lookup saying "Taken": the
           status flips, a free variant is looked for, focus goes back. */
        remember(slug, "taken");
        addressRef.current?.focus();
      } else if (err instanceof HnsError) {
        setFormError(`Couldn’t create the page. ${err.message}`);
      } else {
        setFormError("Couldn’t reach Embarko. Check your connection and try again.");
      }
    }
  }

  /* ---------------------------------------------------------------- UI */

  return (
    <Panel padded className="max-sm:p-4">
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        {/* ---------------------------------------------------- name */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={nameId} className={LABEL}>
              Showcase name
            </label>
            {name.length >= NAME_COUNT_FROM && <span className={COUNT}>{NAME_MAX - name.length} left</span>}
          </div>
          <Input
            ref={nameRef}
            id={nameId}
            className="mt-1.5 h-11 sm:h-10"
            placeholder="e.g. Indore AI Hack Day"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameMissing(false);
            }}
            maxLength={NAME_MAX}
            autoFocus
            autoComplete="off"
            readOnly={creating}
            aria-invalid={nameMissing || undefined}
            aria-describedby={nameMissing ? `${nameId}-error` : undefined}
          />
          {nameMissing && (
            <p id={`${nameId}-error`} className="mt-1.5 text-[0.8rem] text-destructive">
              Give your page a name.
            </p>
          )}
        </div>

        {/* ------------------------------------------------- address */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={addressId} className={LABEL}>
              Page address
            </label>
            <div className="flex min-w-0 items-baseline gap-3">
              {!follow && derived !== "" && final !== derived && !creating && (
                /* The negative margin keeps a 44px tap target on phones
                   without making the label row taller. */
                <LinkButton className="text-[0.8rem] max-sm:-my-3 max-sm:py-3" onClick={matchName}>
                  Match the name
                </LinkButton>
              )}
              <span aria-live="polite" className="text-[0.8rem]">
                <AddressStatus status={status} />
                {/* The one-tap fix shows up in the helper below, which isn't
                    announced; say it here with the verdict. */}
                {taken && suggestion && <span className="sr-only"> {suggestion} is free.</span>}
              </span>
            </div>
          </div>

          {/* One bordered row with the host in front from sm; below that the
              host becomes a caption and the input gets the full width. */}
          <div
            className={cn(
              "mt-1.5 flex flex-col gap-1.5",
              "sm:h-10 sm:flex-row sm:items-center sm:gap-0 sm:rounded-md sm:border sm:px-3 sm:shadow-sm",
              "sm:transition-[color,box-shadow] sm:focus-within:ring-[3px] sm:motion-reduce:transition-none sm:dark:bg-input/30",
              addressInvalid
                ? "sm:border-destructive sm:focus-within:ring-destructive/20"
                : "sm:border-input sm:focus-within:border-ring sm:focus-within:ring-[color-mix(in_srgb,var(--accent)_50%,transparent)]",
            )}
          >
            <span
              id={`${addressId}-host`}
              className="shrink-0 break-all font-mono text-[0.78rem] text-muted-foreground sm:text-sm"
            >
              {SITE_HOST}/showcase/
            </span>
            <input
              ref={addressRef}
              id={addressId}
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              onBlur={onAddressBlur}
              maxLength={SLUG_MAX}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              placeholder="your-showcase"
              readOnly={creating}
              aria-invalid={addressInvalid || undefined}
              aria-describedby={`${addressId}-host ${addressId}-help`}
              className={cn(
                "w-full min-w-0 bg-transparent font-mono text-base text-foreground outline-none placeholder:text-faint sm:h-full sm:flex-1 sm:text-sm",
                /* Below sm the input carries its own edge and focus ring. */
                "max-sm:h-11 max-sm:rounded-md max-sm:border max-sm:px-3 max-sm:shadow-sm max-sm:focus-visible:ring-[3px] max-sm:dark:bg-input/30",
                addressInvalid
                  ? "max-sm:border-destructive max-sm:focus-visible:ring-destructive/20"
                  : "max-sm:border-input max-sm:focus-visible:border-ring max-sm:focus-visible:ring-[color-mix(in_srgb,var(--accent)_50%,transparent)]",
              )}
            />
          </div>

          <div id={`${addressId}-help`} className={cn("mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5", HELP)}>
            {helper}
          </div>
        </div>

        {/* --------------------------------------------- description */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={introId} className={LABEL}>
              Description<span className="font-normal text-muted-foreground"> (optional)</span>
            </label>
            {intro.length >= INTRO_COUNT_FROM && <span className={COUNT}>{INTRO_MAX - intro.length} left</span>}
          </div>
          <textarea
            id={introId}
            rows={3}
            maxLength={INTRO_MAX}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            readOnly={creating}
            placeholder="e.g. 48 hours, 60 teams. Add your app before Sunday 6 pm."
            aria-describedby={`${introId}-help`}
            className="mt-1.5 block w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-base text-foreground shadow-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--accent)_50%,transparent)] motion-reduce:transition-none sm:text-sm dark:bg-input/30"
          />
          <p id={`${introId}-help`} className={cn("mt-1.5", HELP)}>
            Shown under the name on your page and poster.
          </p>
        </div>

        {/* ----------------------------------------------- submit */}
        <div className="flex flex-col gap-3 border-t border-border pt-5">
          <p className="text-[0.82rem] leading-relaxed text-faint">
            It goes live as soon as you create it. The name, address and description can’t be changed later.
          </p>
          {formError && (
            /* Announced: it lands after "Creating…", with focus elsewhere. */
            <div role="alert">
              <Alert>{formError}</Alert>
            </div>
          )}
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button type="submit" disabled={creating} className="max-sm:h-11 max-sm:w-full">
              {creating && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {creating ? "Creating…" : "Create showcase page"}
            </Button>
            <Button asChild variant="ghost" className="max-sm:h-11 max-sm:w-full">
              <Link href="/app/showcase">Cancel</Link>
            </Button>
          </div>
        </div>
      </form>
    </Panel>
  );
}

/* The one-word verdict beside the address label. Always paired with a word,
   never colour alone. */
function AddressStatus({ status }: { status: Status }) {
  switch (status) {
    case "checking":
      return (
        <span className="inline-flex items-center gap-1 text-faint">
          <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Checking…
        </span>
      );
    case "available":
      return (
        /* --ok-ink, not --ok: the word is small text and needs 4.5:1. */
        <span className="inline-flex items-center gap-1 text-[var(--ok-ink)]">
          <Check className="size-3.5" aria-hidden="true" />
          Available
        </span>
      );
    case "taken":
      return <span className="text-destructive">Taken</span>;
    case "reserved":
      return <span className="text-destructive">Reserved</span>;
    default:
      return null;
  }
}
