"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { currentDeployPrompt } from "@/app/lib/deployPrompt";
import { CATEGORIES, DECK, DEFAULT_ENTRY, type DeckEntry } from "./_deck/meta";
import { renderScene } from "./_deck/scenes";
import "./guides-deck.css";

export type DeckPost = {
  slug: string;
  title: string;
  description: string;
  author: string;
  initials: string;
  date: string;
  dateLabel: string;
  readMinutes: number;
};

type Guide = DeckPost & DeckEntry & { n: number };
type Variant = "feature" | "wide" | "half";

const SWIPE_MS = 3600;

/** DECK order first (it is the curated reading order), then any guide without an entry. */
function arrange(posts: DeckPost[]): Guide[] {
  const known = Object.keys(DECK)
    .map((slug) => posts.find((p) => p.slug === slug))
    .filter((p): p is DeckPost => Boolean(p));
  const rest = posts.filter((p) => !DECK[p.slug]);
  return [...known, ...rest].map((p, i) => ({ ...DEFAULT_ENTRY, ...DECK[p.slug], ...p, n: i + 1 }));
}

/* Even count: every card pairs up. Odd: the first takes the full width so the
   rest pair cleanly. Either way the grid ends flush. */
function variants(list: Guide[]): { g: Guide; v: Variant }[] {
  const leadIsWide = list.length % 2 === 1;
  return list.map((g, i) => ({ g, v: leadIsWide && i === 0 ? "wide" : "half" }));
}

const Arrow = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function Card({ g, variant, solo }: { g: Guide; variant: Variant; solo?: boolean }) {
  return (
    <article
      className={`card card--${variant} reveal${solo ? " is-solo" : ""}`}
      data-slug={g.slug}
      style={{ ["--acc" as string]: `var(--g-${g.accent})` }}
    >
      <a className="card__link" href={`/guides/${g.slug}`} aria-label={g.title} />
      <div className="card__media">
        <div className="card__stage" />
        <div className="card__n">
          <i />
          {String(g.n).padStart(2, "0")}
          <span> — {g.kicker}</span>
        </div>
        <div className="card__time">{g.readMinutes} min</div>
        {g.scenes.length > 1 && (
          <div className="swipe" role="tablist" aria-label="Preview">
            {g.scenes.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                data-i={i}
                aria-current={i === 0 ? "true" : "false"}
                aria-label={`Preview ${i + 1} of ${g.scenes.length}`}
              />
            ))}
          </div>
        )}
      </div>
      <div className="card__body">
        <h3 className="card__title">
          {variant === "feature" && g.titleLead && g.titleTail ? (
            <span>
              {g.titleLead} <em>{g.titleTail}</em>
            </span>
          ) : (
            <span>{g.title}</span>
          )}
        </h3>
        <p className="card__dek">{g.description}</p>
        <div className="card__meta">
          <span className="avatar">{g.initials}</span>
          <span>{g.author}</span>
          <span className="dot" />
          <time dateTime={g.date}>{g.dateLabel}</time>
          <span className="card__go">
            <Arrow />
          </span>
        </div>
      </div>
    </article>
  );
}

type Swiper = {
  card: HTMLElement;
  stage: HTMLElement;
  guide: Guide;
  dots: HTMLButtonElement[];
  scenes: HTMLElement[];
  offset: number;
  cur: number;
  ready: boolean;
  visible: boolean;
};

/**
 * The guides index, from the design hand-off (D:\Guides.zip): a featured pair,
 * a rail that always ends flush, sticky category tabs, and card artwork that
 * cross-fades through each guide's story. Server-rendered with every guide's
 * title, description and link in the HTML; scripting only adds behaviour.
 */
export function GuidesDeck({ posts }: { posts: DeckPost[] }) {
  const guides = useMemo(() => arrange(posts), [posts]);
  const [cat, setCat] = useState<string>("all");
  const root = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const ink = useRef<HTMLSpanElement>(null);
  const swipers = useRef<Swiper[]>([]);
  const t0 = useRef(0);
  const flipFrom = useRef<Map<string, DOMRect> | null>(null);
  const [copied, setCopied] = useState(false);

  const countFor = (id: string) => (id === "all" ? guides.length : guides.filter((g) => g.category === id).length);
  const avgRead = guides.length ? Math.round(guides.reduce((s, g) => s + g.readMinutes, 0) / guides.length) : 0;

  const { featShown, rail } = useMemo(() => {
    const matches = (g: Guide) => cat === "all" || g.category === cat;
    let feat = guides.filter((g) => g.featured && matches(g));
    let rest = guides.filter((g) => !g.featured && matches(g));
    // A category without a featured guide promotes its first one, so no tab opens on an empty shelf.
    if (!feat.length && rest.length) {
      feat = rest.slice(0, 1);
      rest = rest.slice(1);
    }
    return { featShown: feat, rail: variants(rest) };
  }, [cat, guides]);
  const active = CATEGORIES.find((c) => c.id === cat);

  /* ---- sliding tab underline ---- */
  const moveInk = () => {
    const btn = tabs.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!btn || !ink.current) return;
    ink.current.style.width = `${btn.offsetWidth}px`;
    ink.current.style.transform = `translateX(${btn.offsetLeft}px)`;
  };
  useLayoutEffect(moveInk, [cat]);

  const pick = (id: string, el?: HTMLElement) => {
    if (id === cat) return;
    const m = new Map<string, DOMRect>();
    root.current?.querySelectorAll<HTMLElement>("[data-slug]").forEach((c) => m.set(c.dataset.slug!, c.getBoundingClientRect()));
    flipFrom.current = m;
    setCat(id);
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  };

  /* ---- once: scripting flag, word rise, clock, scroll choreography ---- */
  useEffect(() => {
    const el = root.current!;
    el.classList.add("gd--js");
    t0.current = performance.now();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    const frame = (now: number) => {
      for (const s of swipers.current) {
        if (!s.ready || s.scenes.length < 2) continue;
        const period = s.scenes.length * SWIPE_MS;
        let t = (now - t0.current + s.offset) % period;
        if (t < 0) t += period;
        const idx = Math.floor(t / SWIPE_MS);
        if (idx !== s.cur) setScene(s, idx);
        if (s.visible) {
          const fill = ((t % SWIPE_MS) / SWIPE_MS).toFixed(3);
          s.dots.forEach((d, k) => d.style.setProperty("--fill", k === idx ? fill : "0"));
        }
      }
      raf = requestAnimationFrame(frame);
    };
    if (!reduced) raf = requestAnimationFrame(frame);

    const spine = el.querySelector<HTMLElement>(".spine")!;
    const spineN = el.querySelector<HTMLElement>(".spine__n")!;
    const spineLabel = el.querySelector<HTMLElement>(".spine__label")!;
    const track = el.querySelector<HTMLElement>(".journey__track");
    const list = el.querySelector<HTMLElement>("#guides")!;
    let ticking = false;
    const onScroll = () => {
      ticking = false;
      const h = innerHeight;
      const max = document.documentElement.scrollHeight - h;
      track?.style.setProperty("--p", `${max > 0 ? (scrollY / max) * 100 : 0}%`);
      const r = list.getBoundingClientRect();
      const total = r.height - h;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      spine.style.setProperty("--p", `${p * 100}%`);
      spine.dataset.show = String(r.top < h * 0.4 && r.bottom > h * 0.6);
      const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-slug]"));
      let best: HTMLElement | null = null;
      let bestD = Infinity;
      for (const c of cards) {
        const b = c.getBoundingClientRect();
        const d = Math.abs(b.top + b.height / 2 - h / 2);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (best) {
        spineN.textContent = `${String(cards.indexOf(best) + 1).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
        spineLabel.textContent = guides.find((g) => g.slug === best!.dataset.slug)?.kicker ?? "";
      }
    };
    const schedule = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(onScroll);
    };
    const onResize = () => {
      schedule();
      moveInk();
    };
    onScroll();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", onResize, { passive: true });
    document.fonts?.ready.then(moveInk);

    // Section headings and the endcap reveal once, like the cards.
    const io = new IntersectionObserver(
      (entries, obs) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-in");
          obs.unobserve(e.target);
        }),
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );
    el.querySelectorAll<HTMLElement>(".reveal:not(.card)").forEach((n, i) => {
      n.style.setProperty("--d", String(i % 4));
      io.observe(n);
    });

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", onResize);
      io.disconnect();
    };
  }, []);

  /* ---- every render of the cards: wire swipers, reveal, spotlight, FLIP ---- */
  useLayoutEffect(() => {
    const el = root.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const accentOf = (key: string) => getComputedStyle(el).getPropertyValue(`--g-${key}`).trim() || "#1a1916";
    const cards = Array.from(el.querySelectorAll<HTMLElement>("article[data-slug]"));
    const cleanups: (() => void)[] = [];

    swipers.current = swipers.current.filter((s) => s.card.isConnected);
    const vis = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          const s = swipers.current.find((x) => x.card === e.target);
          if (!s) return;
          s.visible = e.isIntersecting;
          if (e.isIntersecting && !s.ready) buildScenes(s, accentOf(s.guide.accent));
        }),
      { rootMargin: "300px 0px" },
    );
    const reveal = new IntersectionObserver(
      (entries, obs) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-in");
          obs.unobserve(e.target);
        }),
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

    cards.forEach((card, i) => {
      card.style.setProperty("--d", String(i % 3));
      if (flipFrom.current) card.classList.add("is-in");
      else reveal.observe(card);
      let s = swipers.current.find((x) => x.card === card);
      if (!s) {
        const guide = guides.find((g) => g.slug === card.dataset.slug)!;
        s = {
          card,
          stage: card.querySelector<HTMLElement>(".card__stage")!,
          guide,
          dots: Array.from(card.querySelectorAll<HTMLButtonElement>(".swipe button")),
          scenes: [],
          // Out of phase, so seven cards never flip on one beat.
          offset: (swipers.current.length * 770) % SWIPE_MS,
          cur: 0,
          ready: false,
          visible: false,
        };
        swipers.current.push(s);
      }
      const sw = s;
      const onDot = (e: Event) => {
        const d = (e.target as HTMLElement).closest<HTMLButtonElement>(".swipe button");
        if (!d) return;
        e.preventDefault();
        e.stopPropagation(); // the whole card is a link
        const target = Number(d.dataset.i);
        sw.offset = target * SWIPE_MS - (performance.now() - t0.current); // re-phase so it starts a full turn
        if (sw.ready) setScene(sw, target);
      };
      card.addEventListener("click", onDot);
      cleanups.push(() => card.removeEventListener("click", onDot));
      vis.observe(card);
      if (fine) {
        const onMove = (e: PointerEvent) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
          card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
        };
        card.addEventListener("pointermove", onMove);
        cleanups.push(() => card.removeEventListener("pointermove", onMove));
      }
    });

    /* FLIP: cards that survive a tab change slide to their new home. */
    const before = flipFrom.current;
    flipFrom.current = null;
    if (before && !reduced) {
      const moved: HTMLElement[] = [];
      cards.forEach((c) => {
        const b = before.get(c.dataset.slug!);
        if (!b) {
          c.style.transition = "none";
          c.style.opacity = "0";
          c.style.transform = "translateY(16px)";
          moved.push(c);
          return;
        }
        const a = c.getBoundingClientRect();
        const dx = b.left - a.left;
        const dy = b.top - a.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        c.style.transition = "none";
        c.style.transform = `translate(${dx}px, ${dy}px)`;
        moved.push(c);
      });
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          moved.forEach((c) => {
            c.style.transition = "transform .62s var(--ease), opacity .4s var(--ease)";
            c.style.transform = "";
            c.style.opacity = "";
            c.addEventListener("transitionend", () => (c.style.transition = ""), { once: true });
          }),
        ),
      );
    }

    return () => {
      vis.disconnect();
      reveal.disconnect();
      cleanups.forEach((f) => f());
    };
  }, [featShown, rail, guides]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(currentDeployPrompt());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: nothing to undo */
    }
  };

  const words = ["From", "localhost", "to"];

  return (
    <div ref={root} className="gd">
      <section className="masthead">
        <div className="wrap">
          <nav className="crumbs" aria-label="Breadcrumb">
            <a href="/">Embarko</a>
            <span>/</span>
            <span aria-current="page">Guides</span>
          </nav>
          <div className="mast">
            <div className="mast__lead">
              <h1>
                {words.map((w, i) => (
                  <span key={w}>
                    <span className="rise">
                      <span style={{ ["--i" as string]: i }}>{w}</span>
                    </span>{" "}
                  </span>
                ))}
                <span className="rise">
                  <span style={{ ["--i" as string]: words.length }}>
                    <em>live</em>.
                  </span>
                </span>
              </h1>
              <p className="lede">
                Step-by-step guides for putting an AI-built app online, and for fixing it when a deploy breaks.
              </p>
            </div>
            <dl className="mast__meta">
              <div>
                <dt>Guides</dt>
                <dd>{guides.length}</dd>
              </div>
              <div>
                <dt>Average read</dt>
                <dd>{avgRead} min</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="tabbar">
        <div className="wrap tabbar__in">
          <div className="tabs" ref={tabs} role="tablist" aria-label="Guide categories">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={c.id === cat}
                onClick={(e) => pick(c.id, e.currentTarget)}
              >
                {c.label}
                <span>{countFor(c.id)}</span>
              </button>
            ))}
            <span className="tabs__ink" ref={ink} aria-hidden="true" />
          </div>
          <div className="journey" aria-hidden="true">
            <span className="journey__end">
              <b>localhost:3000</b>
            </span>
            <span className="journey__track">
              <i />
            </span>
            <span className="journey__end journey__end--live">
              <i />
              <b>.embarko.app</b>
            </span>
          </div>
        </div>
      </div>

      <div id="guides">
        <div className="wrap">
          <div className="shead reveal">
            <span className="shead__n">{cat === "all" ? "Start here" : "Best match"}</span>
            <h2>{active?.headline}</h2>
            <span className="shead__rule" />
          </div>
          <div className="grid" id="featured">
            {featShown.map((g) => (
              <Card key={g.slug} g={g} variant="feature" solo={featShown.length === 1} />
            ))}
          </div>

          <div className="shead reveal" hidden={!rail.length}>
            <span className="shead__n">By tool</span>
            <h2>Pick up where your app actually is</h2>
            <span className="shead__rule" />
          </div>
          <div className="grid" id="rail">
            {rail.map(({ g, v }) => (
              <Card key={g.slug} g={g} variant={v} />
            ))}
            {!featShown.length && !rail.length && (
              <div className="empty">
                <h3>No guide in this one yet.</h3>
                <p>We write these as people ask for them. Tell us what you are deploying.</p>
                <button type="button" onClick={() => pick("all")}>
                  Show all {guides.length} guides
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="endcap">
        <div className="wrap">
          <div className="endcap__in reveal">
            <div>
              <h2>
                Got an app ready? <em>Skip the reading.</em>
              </h2>
              <p>
                Copy the prompt, paste it into the agent you already use, and send someone the link. The guides are
                here for when something snags.
              </p>
            </div>
            <button className="btn" type="button" onClick={copy}>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="5.5" y="5.5" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M10.5 3.5A1.5 1.5 0 0 0 9 2H4a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 4 10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <span aria-live="polite">{copied ? "Copied" : "Copy deployment prompt"}</span>
            </button>
          </div>

          <aside className="agents">
            <div>
              <span className="agents__k">For agents</span>
              <p>A plain-text index of every guide, for agents reading this site.</p>
            </div>
            <a href="/guides/llms.txt">
              <code>llms.txt</code>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 3h7v7M13 3L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </aside>
        </div>
      </section>

      <aside className="spine" aria-hidden="true">
        <div className="spine__n">01 / {String(guides.length).padStart(2, "0")}</div>
        <div className="spine__track">
          <div className="spine__fill" style={{ height: "var(--p,0%)" }} />
          <div className="spine__dot" style={{ top: "var(--p,0%)" }} />
        </div>
        <div className="spine__label">{guides[0]?.kicker}</div>
      </aside>
    </div>
  );
}

/* Artwork is built only when a card nears the viewport: 21 SVGs are not parsed up front. */
function buildScenes(s: Swiper, accent: string) {
  s.ready = true;
  s.stage.replaceChildren();
  s.guide.scenes.forEach((id, i) => {
    const d = document.createElement("div");
    d.className = "scene";
    d.dataset.on = String(i === 0);
    d.innerHTML = renderScene(id, accent, s.guide.preview);
    s.stage.appendChild(d);
  });
  s.scenes = Array.from(s.stage.querySelectorAll<HTMLElement>(".scene"));
  s.cur = 0;
}

function setScene(s: Swiper, idx: number) {
  const prev = s.scenes[s.cur];
  if (prev) {
    prev.dataset.on = "false";
    prev.dataset.out = "true";
  }
  const next = s.scenes[idx];
  if (next) {
    next.dataset.out = "false";
    next.dataset.on = "true";
  }
  s.dots.forEach((d, k) => d.setAttribute("aria-current", String(k === idx)));
  s.cur = idx;
}
