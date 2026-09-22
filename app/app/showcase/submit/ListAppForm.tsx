"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, Copy } from "lucide-react";

import { COPIED_LABEL, CopyPromptButton } from "../../../components/CopyPromptButton";
import { Alert, NativeSelect, Page, PageHeader, Panel, PanelTitle, Skeleton } from "../../../components/console/kit";
import { Button, buttonVariants } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { projectsApi, showcaseApi } from "../../../lib/hnsApi";
import { HnsError } from "../../../lib/client";
import { useSession } from "../../../lib/session";
import { CATEGORIES, TOOLS } from "../../../lib/showcaseOptions";
import { showcaseListPrompt } from "../../../lib/showcasePrompt";
import type { Project, ShowcaseListing, ShowcasePage } from "../../../lib/types";

/**
 * Put one of this company's deployed apps on Showcase.
 *
 * Ordered the way the person thinks about it: which app, what to say about
 * it, and only then where it goes — because "where" has an obvious default
 * (your company page) that most people never need to change. Event pages
 * only come up when there is one to choose or an invite link named one.
 *
 * Four fields are required; everything else sits behind "More details". The
 * URL comes from the deployment, and there is no approval — it is live on
 * success.
 */

const field = "w-full";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[0.86rem] font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {hint && <span className="ml-2 text-[0.8rem] text-muted-foreground">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const textarea =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

const SITE_HOST = "embarko.ai";

export function ListAppForm({
  initialPage = "",
  initialApp = "",
  fromSettings = false,
  startOnEvent = false,
}: {
  initialPage?: string;
  initialApp?: string;
  /** Opened from the app's own settings, so that is where "back" goes. */
  fromSettings?: boolean;
  /** The app is already on the company page; the person came to add an event. */
  startOnEvent?: boolean;
}) {
  const { activeCompanyId, user } = useSession();

  /* Where the person came from, and goes back to. */
  const back =
    fromSettings && initialApp
      ? { href: `/app/projects/${encodeURIComponent(initialApp)}/settings`, label: "App settings" }
      : { href: "/app/showcase", label: "Showcase" };

  const [pages, setPages] = useState<ShowcasePage[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectId, setProjectId] = useState(initialApp);

  /* "company" is the default; "event" opens the picker. An invite link that
     names a page starts on "event" with that page filled in. */
  const [where, setWhere] = useState<"company" | "event">(initialPage || startOnEvent ? "event" : "company");
  const [eventSlug, setEventSlug] = useState(initialPage.trim().toLowerCase());
  /* There can be thousands of event pages, so there is no picker: the typed
     address is resolved via the public route. Pages this company already
     knows skip the round trip. */
  const [lookedUp, setLookedUp] = useState<{ slug: string; page: ShowcasePage | null } | null>(null);

  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [tagline, setTagline] = useState("");
  const [creatorName, setCreatorName] = useState(user?.name ?? "");
  const [builtWith, setBuiltWith] = useState("");

  const [more, setMore] = useState(false);
  const [whatItDoes, setWhatItDoes] = useState("");
  const [whyBuilt, setWhyBuilt] = useState("");
  const [creatorProfile, setCreatorProfile] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ShowcaseListing | null>(null);

  useEffect(() => {
    if (!activeCompanyId) return;
    showcaseApi
      .listPages(activeCompanyId)
      .then(setPages)
      .catch((e) => {
        setPages([]);
        setError(e instanceof Error ? e.message : "Couldn’t load Showcase pages.");
      });
  }, [activeCompanyId]);

  useEffect(() => {
    if (!activeCompanyId) return;
    projectsApi
      .list(activeCompanyId)
      .then((list) => {
        setProjects(list);
        /* One app and nothing preselected: choose it, there is nothing to decide. */
        if (!initialApp && list.length === 1) setProjectId(list[0].id);
      })
      .catch((e) => {
        setProjects([]);
        setError(e instanceof Error ? e.message : "Couldn’t load your apps.");
      });
  }, [activeCompanyId, initialApp]);

  /* The listing's name follows the chosen app's name until edited by hand. */
  useEffect(() => {
    if (nameTouched) return;
    const p = projects?.find((x) => x.id === projectId);
    setName(p?.name ?? "");
  }, [projectId, projects, nameTouched]);

  const companyPage = pages?.find((p) => p.type === "company") ?? null;
  const knownEvents = pages?.filter((p) => p.type === "public") ?? [];
  const knownEvent = knownEvents.find((p) => p.slug === eventSlug) ?? null;

  useEffect(() => {
    if (where !== "event" || knownEvent || !eventSlug || eventSlug.length < 3) {
      setLookedUp(null);
      return;
    }
    const slug = eventSlug;
    const handle = window.setTimeout(async () => {
      try {
        const found = await showcaseApi.lookupPage(slug);
        setLookedUp({ slug, page: found });
      } catch {
        setLookedUp({ slug, page: null });
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [eventSlug, knownEvent, where]);

  const eventPage = knownEvent ?? (lookedUp?.slug === eventSlug ? lookedUp.page : null);
  /* Another company's own page: only its apps may go there. */
  const foreignCompanyPage = where === "event" && !knownEvent && eventPage?.type === "company";
  const unknownEvent = where === "event" && pages !== null && eventSlug !== "" && lookedUp?.slug === eventSlug && !eventPage;
  const checking = where === "event" && !knownEvent && eventSlug.length >= 3 && lookedUp?.slug !== eventSlug;

  const target = where === "company" ? companyPage : foreignCompanyPage ? null : eventPage;
  /* What the prompt names: the chosen page, or the company page while an
     event address is still being typed. */
  const promptTarget = target ?? companyPage;
  const project = projects?.find((p) => p.id === projectId) ?? null;

  const canSubmit = !!target && !!projectId && name.trim() && tagline.trim() && creatorName.trim() && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId || !canSubmit || !target) return;
    setBusy(true);
    setError(null);
    try {
      const listing = await showcaseApi.submit(activeCompanyId, {
        collectionSlug: target.slug,
        projectId,
        name: name.trim(),
        tagline: tagline.trim(),
        whatItDoes: whatItDoes.trim() || undefined,
        whyBuilt: whyBuilt.trim() || undefined,
        creatorName: creatorName.trim(),
        creatorProfile: creatorProfile.trim() || undefined,
        builtWith: builtWith || undefined,
        category: category || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        screenshotUrl: screenshotUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
      });
      setDone(listing);
    } catch (e) {
      if (e instanceof HnsError && e.code === "SHOWCASE_ALREADY_LISTED") {
        setError("That app is already on this page.");
      } else if (e instanceof HnsError && e.code === "SHOWCASE_COLLECTION_PRIVATE") {
        setError("That’s another company’s own page; only their apps can go there. Pick an event page instead.");
      } else if (e instanceof HnsError && e.code === "SHOWCASE_COLLECTION_UNKNOWN") {
        setError("That Showcase page doesn’t exist any more.");
      } else if (e instanceof HnsError && e.details?.length) {
        setError(e.details.map((d) => d.message).join(" "));
      } else {
        setError(e instanceof Error ? e.message : "Couldn’t list that app.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const onEvent = done.collection.type === "public";
    return (
      <Page>
        <Link href={back.href} className="text-[0.82rem] text-muted-foreground hover:text-foreground">
          ← {back.label}
        </Link>
        <PageHeader
          title={`${done.name} is on Showcase.`}
          subtitle={
            onEvent
              ? `It’s live on ${done.collection.title} and in the Showcase gallery.`
              : "It’s live on your company page and in the Showcase gallery, with a public page of its own."
          }
        />
        <div className="flex flex-wrap gap-2.5">
          <Button asChild>
            <a href={`/showcase/app/${done.slug}`} target="_blank" rel="noreferrer">
              See its page
              <ArrowUpRight aria-hidden="true" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/showcase/${done.collection.slug}`} target="_blank" rel="noreferrer">
              {onEvent ? `See ${done.collection.title}` : "See your company page"}
            </a>
          </Button>
          <Button asChild variant="ghost">
            <Link href={back.href}>Back to {back.label.toLowerCase()}</Link>
          </Button>
        </div>
        <Panel padded className="flex flex-col gap-3">
          <PanelTitle>Want a richer page?</PanelTitle>
          <p className="text-[0.9rem] text-muted-foreground">
            Your AI knows the app best. Paste this prompt and it fills in the description, category, tags
            and a screenshot for you.
          </p>
          <div>
            <CopyPromptButton
              text={showcaseListPrompt(done.collection, project?.slug)}
              className={buttonVariants({ variant: "outline" })}
              copiedChildren={
                <>
                  <Check aria-hidden="true" />
                  {COPIED_LABEL}
                </>
              }
            >
              <Copy aria-hidden="true" />
              Copy Showcase prompt
            </CopyPromptButton>
          </div>
        </Panel>
      </Page>
    );
  }

  const noApps = projects !== null && projects.length === 0;

  return (
    <Page>
      <Link href={back.href} className="text-[0.82rem] text-muted-foreground hover:text-foreground">
        ← {back.label}
      </Link>
      <PageHeader
        title="List an app"
        subtitle="It gets a public page on Showcase straight away. Your AI can do it, or you can fill in the form."
      />

      {/* The AI path first: the agent that built the app already knows what
          it does, and writes a fuller page than anyone fills in by hand. The
          prompt names the page chosen below, so switching to an event page
          changes what gets copied. */}
      {pages && !noApps && (
        <Panel padded className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 max-w-[60ch]">
            <PanelTitle>Let your AI list it</PanelTitle>
            <p className="mt-1 text-[0.9rem] text-muted-foreground">
              Paste this into the AI that built the app. It fills in the description, screenshot and tags
              from the code and puts the app on{" "}
              {promptTarget?.type === "public" ? promptTarget.title : "your company page"}.
            </p>
          </div>
          <CopyPromptButton
            text={showcaseListPrompt(promptTarget ?? { slug: "", title: "", type: "company" }, project?.slug)}
            className={buttonVariants()}
            disabled={!promptTarget}
            copiedChildren={
              <>
                <Check aria-hidden="true" />
                {COPIED_LABEL}
              </>
            }
          >
            <Copy aria-hidden="true" />
            Copy Showcase prompt
          </CopyPromptButton>
        </Panel>
      )}

      {pages && !noApps && (
        <p className="text-center text-[0.82rem] font-medium uppercase tracking-wider text-faint">or fill it in yourself</p>
      )}

      <form
        onSubmit={submit}
        onKeyDown={(e) => {
          /* Enter in a text field must not list the app — the tags field in
             particular invites it, and a listing is live at once. Only the
             button submits; textareas keep Enter for newlines anyway. */
          if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
        }}
        className="flex flex-col gap-6"
      >
        {/* ------------------------------------------------------ 1. app */}
        <Panel padded className="flex flex-col gap-4">
          <PanelTitle>1. Which app</PanelTitle>
          {projects === null && <Skeleton className="h-9" aria-hidden="true" />}
          {noApps && (
            <Alert variant="note">
              Showcase lists apps that are live on Embarko, and this company has none yet.{" "}
              <Link href="/app" className="underline">
                Deploy one first
              </Link>
              .
            </Alert>
          )}
          {projects && projects.length > 0 && (
            <Field label="Deployed app" hint="Its live address comes from the deployment" required>
              <NativeSelect className={field} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Select…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.slug}.app.embarko.ai
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
        </Panel>

        {/* ---------------------------------------------------- 2. about */}
        <Panel padded className="flex flex-col gap-4">
          <PanelTitle>2. About it</PanelTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <Input
                className={field}
                value={name}
                onChange={(e) => {
                  setNameTouched(true);
                  setName(e.target.value);
                }}
                maxLength={80}
                required
              />
            </Field>
            <Field label="Built with">
              <NativeSelect className={field} value={builtWith} onChange={(e) => setBuiltWith(e.target.value)}>
                <option value="">Which AI built it?</option>
                {TOOLS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="What does it do?" hint="One sentence. Shown under the name everywhere." required>
            <textarea
              className={`${textarea} resize-none`}
              rows={2}
              maxLength={160}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Turns meeting notes into a to-do list"
              required
            />
          </Field>
          <Field label="Built by" hint="Shown on the page" required>
            <Input className={field} value={creatorName} onChange={(e) => setCreatorName(e.target.value)} maxLength={80} required />
          </Field>

          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            aria-expanded={more}
            className="inline-flex w-fit items-center gap-1 text-[0.84rem] font-semibold text-muted-foreground hover:text-foreground"
          >
            <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${more ? "rotate-180" : ""}`} />
            More details
            <span className="font-normal">— optional: screenshot, longer description, tags</span>
          </button>

          {more && (
            <div className="flex flex-col gap-4 border-t border-border pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Screenshot URL" hint="Makes the card look real">
                  <Input className={field} type="url" value={screenshotUrl} onChange={(e) => setScreenshotUrl(e.target.value)} placeholder="https://" />
                </Field>
                <Field label="Demo video URL" hint="YouTube plays inline">
                  <Input className={field} type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://" />
                </Field>
              </div>
              <Field label="More about it" hint="A few real sentences beat a one-liner">
                <textarea
                  className={`${textarea} resize-none`}
                  rows={5}
                  maxLength={4000}
                  value={whatItDoes}
                  onChange={(e) => setWhatItDoes(e.target.value)}
                />
              </Field>
              <Field label="Why was it built?">
                <textarea
                  className={`${textarea} resize-none`}
                  rows={3}
                  maxLength={600}
                  value={whyBuilt}
                  onChange={(e) => setWhyBuilt(e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category">
                  <NativeSelect className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">Select…</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Your profile or social link">
                  <Input className={field} type="url" value={creatorProfile} onChange={(e) => setCreatorProfile(e.target.value)} placeholder="https://" />
                </Field>
              </div>
              <Field label="Tags" hint="Comma separated">
                <Input className={field} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="college, finance, health" />
              </Field>
            </div>
          )}
        </Panel>

        {/* ---------------------------------------------------- 3. where */}
        <Panel padded className="flex flex-col gap-4">
          <PanelTitle>3. Where it appears</PanelTitle>
          {pages === null && <Skeleton className="h-9" aria-hidden="true" />}
          {pages && (
            <div className="flex flex-col gap-2">
              <WhereOption
                checked={where === "company"}
                onSelect={() => setWhere("company")}
                title="Your company page"
                detail={
                  companyPage
                    ? `${SITE_HOST}/showcase/${companyPage.slug} — and the main Showcase gallery`
                    : "Being set up. Sign out and back in if it doesn’t appear."
                }
                disabled={!companyPage}
              />
              <WhereOption
                checked={where === "event"}
                onSelect={() => setWhere("event")}
                title="An event page"
                detail="Type the page address the organiser shared with you. Also appears in the gallery."
              >
                {where === "event" && (
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex h-9 items-center rounded-md border border-input px-3 font-mono text-sm">
                      <span className="shrink-0 text-muted-foreground">{SITE_HOST}/showcase/</span>
                      <input
                        className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                        placeholder="the address the organiser gave you"
                        autoFocus
                        value={eventSlug}
                        onChange={(e) => setEventSlug(e.target.value.trim().toLowerCase())}
                        maxLength={40}
                        spellCheck={false}
                        autoComplete="off"
                        aria-label="Event page address"
                      />
                    </div>
                    {checking && <p className="text-[0.85rem] text-muted-foreground">Checking…</p>}
                    {eventPage && !foreignCompanyPage && (
                      <p className="text-[0.85rem] text-muted-foreground">
                        Found <b className="text-foreground">{eventPage.title}</b>.
                      </p>
                    )}
                    {foreignCompanyPage && (
                      <p role="alert" className="text-[0.85rem] text-destructive">
                        That’s another company’s own page. Only their apps can go there.
                      </p>
                    )}
                    {unknownEvent && (
                      <p role="alert" className="text-[0.85rem] text-destructive">
                        There’s no Showcase page at {SITE_HOST}/showcase/{eventSlug}. Check the address with the organiser.
                      </p>
                    )}
                  </div>
                )}
              </WhereOption>
            </div>
          )}
        </Panel>

        {error && <Alert>{error}</Alert>}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!canSubmit}>
            {busy ? "Listing…" : "Put it on Showcase"}
          </Button>
          <span className="text-[0.85rem] text-muted-foreground">Live straight away. You can remove it any time.</span>
        </div>
      </form>
    </Page>
  );
}

/* One radio card. The whole card is the label, so clicking the text picks it. */
function WhereOption({
  checked,
  onSelect,
  title,
  detail,
  disabled,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-md border p-3.5 transition-colors ${
        checked ? "border-primary bg-primary/5" : "border-border"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <label className={`flex items-start gap-3 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
        <input
          type="radio"
          name="where"
          checked={checked}
          onChange={onSelect}
          disabled={disabled}
          className="mt-1 size-4 accent-primary"
        />
        <span className="min-w-0">
          <span className="block text-[0.92rem] font-medium text-foreground">{title}</span>
          <span className="block text-[0.82rem] text-muted-foreground">{detail}</span>
        </span>
      </label>
      {children && <div className="pl-7">{children}</div>}
    </div>
  );
}
