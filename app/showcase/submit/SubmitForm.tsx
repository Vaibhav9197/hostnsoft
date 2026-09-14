"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CATEGORIES, TOOLS } from "../../lib/showcase";
import { BTN_GHOST, BTN_PRIMARY, LABEL } from "../kit";

/**
 * The submission form.
 *
 * Two short steps and an optional third. It is deliberately not a wizard with
 * saved state and a progress bar — the whole thing is a dozen fields, and
 * paging them would make a two-minute task feel like an application form.
 *
 * Everything the platform already knows is left out: no app name confirmation,
 * no hosting details, no project picker. What is asked for is what only the
 * creator can answer.
 */

const field =
  "w-full rounded-[8px] border border-border bg-card px-3.5 py-2.5 text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--line-strong)]";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[14px] font-medium">{label}</span>
      {hint && <span className="ml-2 text-[13px] text-muted-foreground">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

interface Result {
  slug: string;
  withVideo: boolean;
}

export function SubmitForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Result | null>(null);

  const [appUrl, setAppUrl] = useState("");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [whyBuilt, setWhyBuilt] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [creatorProfile, setCreatorProfile] = useState("");
  const [builtWith, setBuiltWith] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [hackathonCode, setHackathonCode] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/showcase/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appUrl,
          name,
          tagline,
          whyBuilt,
          creatorName,
          creatorProfile,
          builtWith,
          category,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          hackathonCode,
          videoUrl,
        }),
      });
      const body = (await res.json()) as { slug?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Couldn’t submit that.");
      setDone({ slug: body.slug!, withVideo: Boolean(videoUrl.trim()) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t submit that.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-12 max-w-[560px]">
        <h2 className="text-[32px] font-semibold leading-tight tracking-[-0.015em]">Submitted.</h2>
        <p className="mt-4 text-[16px] leading-[1.6] text-muted-foreground">
          We’ll review your project for Showcase.
          {done.withVideo && " We’ll also review your 1-year Pro request."}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href={appUrl} target="_blank" rel="noreferrer" className={BTN_PRIMARY}>
            Open app
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </a>
          <Link href="/showcase" className={BTN_GHOST}>
            See Showcase
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-12 max-w-[560px] space-y-12">
      <fieldset className="space-y-5" disabled={busy}>
        <legend className={`${LABEL} mb-1`}>Step 1 — Your app</legend>

        <Field label="App URL">
          <input
            type="url"
            required
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
            placeholder="https://your-app.app.embarko.ai"
            className={field}
          />
        </Field>

        <Field label="App name">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </Field>

        <Field label="What does it do?" hint="One or two sentences">
          <textarea
            required
            rows={2}
            maxLength={160}
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className={`${field} resize-none`}
          />
        </Field>

        <Field label="Why did you build it?" hint="Optional">
          <textarea
            rows={3}
            maxLength={600}
            value={whyBuilt}
            onChange={(e) => setWhyBuilt(e.target.value)}
            className={`${field} resize-none`}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-5" disabled={busy}>
        <legend className={`${LABEL} mb-1`}>Step 2 — You</legend>

        <Field label="Your name">
          <input
            type="text"
            required
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            className={field}
          />
        </Field>

        <Field label="Profile or social link" hint="Optional">
          <input
            type="url"
            value={creatorProfile}
            onChange={(e) => setCreatorProfile(e.target.value)}
            placeholder="https://"
            className={field}
          />
        </Field>

        <Field label="What did you use to build it?">
          <select value={builtWith} onChange={(e) => setBuiltWith(e.target.value)} className={field}>
            <option value="">Select…</option>
            {TOOLS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            <option value="">Select…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tags" hint="Optional, comma separated">
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="college, finance, health"
            className={field}
          />
        </Field>

        {/* Asked for, not searched for. Preselecting this from the creator's
            activated code is backend work that doesn't exist yet, so until it
            does the field is here and optional rather than absent. */}
        <Field label="Hackathon or event code" hint="Optional">
          <input
            type="text"
            value={hackathonCode}
            onChange={(e) => setHackathonCode(e.target.value.toUpperCase())}
            placeholder="IITINDORE26"
            className={`${field} font-mono`}
          />
        </Field>
      </fieldset>

      {/* Separated from the form above by a rule, because it is a different
          offer rather than a further requirement. Submitting never needs it. */}
      <fieldset className="space-y-5 border-t border-border pt-10" disabled={busy}>
        <legend className="sr-only">Optional — Embarko Pro offer</legend>
        <div>
          <h2 className="text-[22px] font-semibold leading-tight">
            Want Embarko Pro free for 1 year?
          </h2>
          <p className="mt-2 text-[15px] leading-[1.6] text-muted-foreground">
            Show what you built. A short video covering what it is, who it helps, a quick demo, and
            how you put it online with Embarko. Tag us.
          </p>
        </div>

        <Field label="Instagram Reel or YouTube URL" hint="Optional">
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://"
            className={field}
          />
        </Field>
      </fieldset>

      {error && (
        <p role="alert" className="text-[14px] text-destructive">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className={`${BTN_PRIMARY} disabled:opacity-60`}>
        {busy ? "Submitting…" : "Submit to Showcase"}
        {!busy && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
      </button>
    </form>
  );
}
