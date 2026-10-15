"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
const LABELS: Record<string, string> = { ...Object.fromEntries(CHOICES.map((c) => [c.key, c.label])), any: "Any AI tool" };

/**
 * The guides as one journey, in the same language as the guides themselves:
 * a route line runs down the list and fills as you scroll, each guide is a
 * stop with its own route (where the app is today → a live link) that draws
 * as it comes into view, and the list ends on the live link. Picking where
 * your app is moves its guide to the top; nothing is hidden. Without
 * JavaScript it is a plain list of links with every route drawn.
 */
export function GuidesIndex({ posts }: { posts: IndexPost[] }) {
  const [pick, setPick] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const ordered = useMemo(() => {
    if (!pick) return posts;
    const match = posts.filter((p) => STARTS[p.slug]?.key === pick);
    return [...match, ...posts.filter((p) => !match.includes(p))];
  }, [pick, posts]);
  const best = pick ? posts.find((p) => STARTS[p.slug]?.key === pick) : undefined;

  /* Scroll: rows draw their route as they arrive; the journey line fills. */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.classList.add("gx-js");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rows = Array.from(el.querySelectorAll<HTMLElement>(".gx-row"));
    const list = el.querySelector<HTMLElement>(".gx-list");
    if (reduced || !("IntersectionObserver" in window) || !list) {
      rows.forEach((r) => r.classList.add("is-in"));
      el.style.setProperty("--fill", "1");
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }),
      { rootMargin: "0px 0px -12% 0px", threshold: 0.2 },
    );
    rows.forEach((r) => io.observe(r));
    let raf = 0;
    const tick = () => {
      raf = 0;
      const r = list.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.62 - r.top) / (r.height || 1)));
      el.style.setProperty("--fill", p.toFixed(4));
      el.classList.toggle("is-arrived", p > 0.98);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      io.disconnect();
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /* A newly picked guide is already on screen: draw it at once. */
  useEffect(() => {
    root.current?.querySelectorAll(".gx-row.is-match").forEach((r) => r.classList.add("is-in"));
  }, [pick]);

  return (
    <div ref={root} className={`gx ${pick ? "gx--picked" : ""}`}>
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

      <div className="gx-journey">
        <span className="gx-rail" aria-hidden="true">
          <i />
        </span>
        <ol className="gx-list">
          {ordered.map((p, i) => {
            const start = STARTS[p.slug] ?? { key: "", from: "your app" };
            const isMatch = !!pick && start.key === pick;
            return (
              <li key={p.slug} className={`gx-row ${isMatch ? "is-match is-in" : ""} ${pick && !isMatch ? "is-other" : ""}`}>
                <span className="gx-node" aria-hidden="true" />
                <Link href={`/guides/${p.slug}`} className="gx-row__link">
                  <span className="gx-row__text">
                    <span className="gx-eyebrow">
                      <span className="gx-eyebrow__n">{String(i + 1).padStart(2, "0")}</span> — {LABELS[start.key] ?? "Guide"}
                    </span>
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
                  <ArrowRight aria-hidden="true" className="gx-row__arrow" />
                </Link>
              </li>
            );
          })}
        </ol>
        <p className="gx-end">
          <span className="gx-end__node" aria-hidden="true" />
          <span>
            Every route ends in the same place: <strong>a live link anyone can open</strong>.
          </span>
        </p>
      </div>
    </div>
  );
}
