"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import "./guides-index.css";

export type IndexPost = {
  slug: string;
  title: string;
  description: string;
  author: string;
  initials: string;
  date: string;
  dateLabel: string;
  readMinutes: number;
};

/* Where each guide starts from. Every guide is the same trip, from where the
   app lives today to a live link; the start is what tells them apart. */
const STARTS: Record<string, { key: string; from: string }> = {
  "how-to-deploy-ai-app": { key: "any", from: "localhost:3000" },
  "host-website-built-with-claude": { key: "claude", from: "Claude Code" },
  "deploy-from-cursor": { key: "cursor", from: "Cursor · Agent" },
  "deploy-antigravity-website": { key: "antigravity", from: "Antigravity · Agent" },
  "deploy-replit-app-free": { key: "replit", from: "Replit · .zip" },
  "deploy-app-without-github": { key: "folder", from: "~/my-app/" },
  "free-hosting-for-students": { key: "student", from: "class-project/" },
};

const CHOICES: { key: string; label: string }[] = [
  { key: "claude", label: "Claude" },
  { key: "cursor", label: "Cursor" },
  { key: "antigravity", label: "Antigravity" },
  { key: "replit", label: "Replit" },
  { key: "folder", label: "A folder, no GitHub" },
  { key: "student", label: "A class project" },
  { key: "any", label: "Not sure" },
];

/**
 * The guides as routes: pick where your app is today and its route moves to
 * the top and lights up. Nothing is hidden; the other guides stay readable
 * below it. Without JavaScript it is a plain list of links.
 */
export function GuidesIndex({ posts }: { posts: IndexPost[] }) {
  const [pick, setPick] = useState<string | null>(null);

  const ordered = useMemo(() => {
    if (!pick) return posts;
    const match = posts.filter((p) => STARTS[p.slug]?.key === pick);
    return [...match, ...posts.filter((p) => !match.includes(p))];
  }, [pick, posts]);
  const best = pick ? posts.find((p) => STARTS[p.slug]?.key === pick) : undefined;

  return (
    <div className={`gx ${pick ? "gx--picked" : ""}`}>
      <div className="gx-pick">
        <p id="gx-pick-q" className="gx-pick__q">
          Where is your app right now?
        </p>
        <div className="gx-pick__chips" role="group" aria-labelledby="gx-pick-q">
          {CHOICES.map((c) => (
            <button
              key={c.key}
              type="button"
              className="gx-chip"
              aria-pressed={pick === c.key}
              onClick={() => setPick(pick === c.key ? null : c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="gx-pick__say" aria-live="polite">
          {best ? (
            <>
              Your route: <Link href={`/guides/${best.slug}`}>{best.title}</Link>
            </>
          ) : (
            "Pick one and its guide moves to the top."
          )}
        </p>
      </div>

      <ol className="gx-list">
        {ordered.map((p, i) => {
          const start = STARTS[p.slug] ?? { key: "", from: "your app" };
          const isMatch = !!pick && start.key === pick;
          return (
            <li key={p.slug} className={`gx-row ${isMatch ? "is-match" : ""} ${pick && !isMatch ? "is-other" : ""}`} style={{ ["--i" as string]: i }}>
              <Link href={`/guides/${p.slug}`} className="gx-row__link">
                <span className="gx-route" aria-hidden="true">
                  <span className="gx-route__from">{start.from}</span>
                  <span className="gx-route__line">
                    <i />
                  </span>
                  <span className="gx-route__to">
                    <span className="gx-route__dot" />
                    live link
                  </span>
                </span>
                <span className="gx-row__text">
                  <h3 className="gx-row__title">{p.title}</h3>
                  <span className="gx-row__desc">{p.description}</span>
                  <span className="gx-row__meta">
                    <span className="gx-row__avatar" aria-hidden="true">
                      {p.initials}
                    </span>
                    <span>{p.author}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={p.date}>{p.dateLabel}</time>
                    <span aria-hidden="true">·</span>
                    <span>{p.readMinutes} min read</span>
                  </span>
                </span>
                <ArrowRight aria-hidden="true" className="gx-row__arrow" />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
