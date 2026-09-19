"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { Alert, NativeSelect, Page, PageHeader, Panel, PanelTitle, Skeleton } from "../../../components/console/kit";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { projectsApi, showcaseApi } from "../../../lib/hnsApi";
import { HnsError } from "../../../lib/client";
import { useSession } from "../../../lib/session";
import { CATEGORIES, TOOLS } from "../../../lib/showcaseOptions";
import type { Project, ShowcaseListing, ShowcasePage } from "../../../lib/types";

/**
 * List one of this company's deployed apps on a showcase page.
 * Three steps: which page, which app, a few words. The URL comes from the
 * deployment, and there is no approval — it is live on success.
 */

const field = "w-full";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[0.86rem] font-medium text-foreground">{label}</span>
      {hint && <span className="ml-2 text-[0.8rem] text-muted-foreground">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const textarea =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

export function ListAppForm({ initialPage = "" }: { initialPage?: string }) {
  const { activeCompanyId, user } = useSession();

  const [pages, setPages] = useState<ShowcasePage[] | null>(null);
  const [pageSlug, setPageSlug] = useState(initialPage.trim().toLowerCase());
  /* A hand-typed slug not in the picker is resolved via the public route. */
  const [lookedUp, setLookedUp] = useState<{ slug: string; page: ShowcasePage | null } | null>(null);

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectId, setProjectId] = useState("");

  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [tagline, setTagline] = useState("");
  const [whatItDoes, setWhatItDoes] = useState("");
  const [whyBuilt, setWhyBuilt] = useState("");
  const [creatorName, setCreatorName] = useState(user?.name ?? "");
  const [creatorProfile, setCreatorProfile] = useState("");
  const [builtWith, setBuiltWith] = useState("");
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
        setError(e instanceof Error ? e.message : "Couldn’t load showcase pages.");
      });
  }, [activeCompanyId]);

  useEffect(() => {
    if (!activeCompanyId) return;
    projectsApi
      .list(activeCompanyId)
      .then(setProjects)
      .catch((e) => {
        setProjects([]);
        setError(e instanceof Error ? e.message : "Couldn’t load your apps.");
      });
  }, [activeCompanyId]);

  /* The listing's name follows the chosen app's name until edited by hand. */
  useEffect(() => {
    if (nameTouched) return;
    const p = projects?.find((x) => x.id === projectId);
    setName(p?.name ?? "");
  }, [projectId, projects, nameTouched]);

  const known = pages?.find((p) => p.slug === pageSlug) ?? null;

  useEffect(() => {
    if (known || !pageSlug || pageSlug.length < 3) {
      setLookedUp(null);
      return;
    }
    const slug = pageSlug;
    const handle = window.setTimeout(async () => {
      try {
        const found = await showcaseApi.lookupPage(slug);
        setLookedUp({ slug, page: found });
      } catch {
        setLookedUp({ slug, page: null });
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [pageSlug, known]);

  const page = known ?? (lookedUp?.slug === pageSlug ? lookedUp.page : null);
  /* Another company's own page: only its apps may go there. */
  const foreignCompanyPage = !known && page?.type === "company";
  const unknownPage = pages !== null && pageSlug !== "" && lookedUp?.slug === pageSlug && !page;
  const checking = !known && pageSlug.length >= 3 && lookedUp?.slug !== pageSlug;

  const canSubmit =
    !!page && !foreignCompanyPage && !!projectId && name.trim() && tagline.trim() && creatorName.trim() && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId || !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const listing = await showcaseApi.submit(activeCompanyId, {
        collectionSlug: pageSlug,
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
        setError("That app is already listed on this page.");
      } else if (e instanceof HnsError && e.code === "SHOWCASE_COLLECTION_PRIVATE") {
        setError("That’s another company’s own page; only their apps can go there. Pick a public board instead.");
      } else if (e instanceof HnsError && e.code === "SHOWCASE_COLLECTION_UNKNOWN") {
        setError("That showcase page doesn’t exist any more.");
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
    return (
      <Page>
        <Link href="/app/showcase" className="text-[0.82rem] text-muted-foreground hover:text-foreground">
          ← Showcase
        </Link>
        <PageHeader title="Listed." subtitle={<>{done.name} is now on {done.collection.title}.</>} />
        <div className="flex flex-wrap gap-2.5">
          <Button asChild>
            <a href={`/showcase/app/${done.slug}`} target="_blank" rel="noreferrer">
              See its Showcase page
              <ArrowUpRight aria-hidden="true" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/showcase/${done.collection.slug}`} target="_blank" rel="noreferrer">
              See /showcase/{done.collection.slug}
            </a>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/app/showcase">Back to Showcase</Link>
          </Button>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <Link href="/app/showcase" className="text-[0.82rem] text-muted-foreground hover:text-foreground">
        ← Showcase
      </Link>
      <PageHeader
        title="List an app"
        subtitle="Put one of your deployed apps on your company page or on a public board. It goes live straight away."
      />

      <form onSubmit={submit} className="flex flex-col gap-6">
        <Panel padded className="flex flex-col gap-4">
          <PanelTitle>1. Which page</PanelTitle>
          {pages === null && <Skeleton className="h-9" aria-hidden="true" />}
          {pages && (
            <Field label="Showcase page" hint="Your company’s own page, or any public board">
              <NativeSelect className={field} value={pageSlug} onChange={(e) => setPageSlug(e.target.value)}>
                <option value="">Select…</option>
                {pages.some((p) => p.type === "company") && (
                  <optgroup label="Your company">
                    {pages
                      .filter((p) => p.type === "company")
                      .map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.title} — /showcase/{p.slug}
                        </option>
                      ))}
                  </optgroup>
                )}
                {pages.some((p) => p.type === "public") && (
                  <optgroup label="Public boards">
                    {pages
                      .filter((p) => p.type === "public")
                      .map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.title} — /showcase/{p.slug}
                        </option>
                      ))}
                  </optgroup>
                )}
              </NativeSelect>
            </Field>
          )}
          {pages && (
            <Field label="Or type a page address" hint="Any public board on Embarko Showcase">
              <div className="flex items-center gap-0 rounded-md border border-input px-3 font-mono text-sm">
                <span className="shrink-0 text-muted-foreground">/showcase/</span>
                <input
                  className="h-9 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                  placeholder="iit-indore-2026"
                  value={pageSlug}
                  onChange={(e) => setPageSlug(e.target.value.trim().toLowerCase())}
                  maxLength={40}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            </Field>
          )}
          {checking && <p className="text-[0.85rem] text-muted-foreground">Checking…</p>}
          {foreignCompanyPage && (
            <p role="alert" className="text-[0.85rem] text-destructive">
              /showcase/{pageSlug} is another company’s own page; only their apps can be listed there. Pick a
              public board instead.
            </p>
          )}
          {page && !foreignCompanyPage && (
            <p className="text-[0.85rem] text-muted-foreground">
              Your app will be listed on <b className="text-foreground">{page.title}</b> at{" "}
              <span className="font-mono">/showcase/{page.slug}</span>, and on the main gallery.
            </p>
          )}
          {unknownPage && (
            <p role="alert" className="text-[0.85rem] text-destructive">
              There’s no showcase page at /showcase/{pageSlug}.
            </p>
          )}
        </Panel>

        <Panel padded className="flex flex-col gap-4">
          <PanelTitle>2. Which app</PanelTitle>
          {projects === null && <Skeleton className="h-9" aria-hidden="true" />}
          {projects && projects.length === 0 && (
            <Alert variant="note">
              This company has no deployed apps yet.{" "}
              <Link href="/app" className="underline">
                Deploy one first
              </Link>
              .
            </Alert>
          )}
          {projects && projects.length > 0 && (
            <Field label="Deployed app" hint="Its live URL is taken from the deployment">
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

        <Panel padded className="flex flex-col gap-4">
          <PanelTitle>3. About it</PanelTitle>
          <Field label="Name on the page">
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
          <Field label="What does it do?" hint="One or two sentences">
            <textarea
              className={`${textarea} resize-none`}
              rows={2}
              maxLength={160}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              required
            />
          </Field>
          <Field
            label="More about it"
            hint="Optional — this is the page's description. A few real sentences beat a one-liner."
          >
            <textarea
              className={`${textarea} resize-none`}
              rows={6}
              maxLength={4000}
              value={whatItDoes}
              onChange={(e) => setWhatItDoes(e.target.value)}
            />
          </Field>
          <Field label="Why was it built?" hint="Optional">
            <textarea
              className={`${textarea} resize-none`}
              rows={3}
              maxLength={600}
              value={whyBuilt}
              onChange={(e) => setWhyBuilt(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Built by">
              <Input className={field} value={creatorName} onChange={(e) => setCreatorName(e.target.value)} maxLength={80} required />
            </Field>
            <Field label="Profile or social link" hint="Optional">
              <Input className={field} type="url" value={creatorProfile} onChange={(e) => setCreatorProfile(e.target.value)} placeholder="https://" />
            </Field>
            <Field label="Built with">
              <NativeSelect className={field} value={builtWith} onChange={(e) => setBuiltWith(e.target.value)}>
                <option value="">Select…</option>
                {TOOLS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </NativeSelect>
            </Field>
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
          </div>
          <Field label="Tags" hint="Optional, comma separated">
            <Input className={field} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="college, finance, health" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Screenshot URL" hint="Optional">
              <Input className={field} type="url" value={screenshotUrl} onChange={(e) => setScreenshotUrl(e.target.value)} placeholder="https://" />
            </Field>
            <Field label="Video URL" hint="Optional">
              <Input className={field} type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://" />
            </Field>
          </div>
        </Panel>

        {error && <Alert>{error}</Alert>}

        <div>
          <Button type="submit" disabled={!canSubmit}>
            {busy ? "Listing…" : "List it"}
          </Button>
        </div>
      </form>
    </Page>
  );
}
