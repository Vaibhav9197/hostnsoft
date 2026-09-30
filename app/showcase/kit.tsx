import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { ShotImage } from "./ShotImage";
import { Pill, PrimaryCta, Steps as DsSteps } from "../components/ds";
import { COPIED_LABEL, CopyPromptButton } from "../components/CopyPromptButton";
import { showcaseGeneralPrompt } from "../lib/showcasePrompt";

import type { ShowcaseApp } from "../lib/showcase";

/**
 * The stand-in shown when a submission has no screenshot.
 *
 * Not a grey box and not a logo: the page's whole premise is that you are
 * looking at the thing someone made, so an empty slot reads as a broken app
 * rather than a missing file. This draws an abstract suggestion of an
 * interface instead, seeded from the slug so a given app always gets the same
 * one and the gallery doesn't reshuffle between renders.
 *
 * It is decoration, so it is hidden from assistive tech — the name and the
 * description next to it carry the meaning.
 */
/* Ground and highlight for the stand-in art: the site's own cream tones, so a
   gallery of apps without screenshots stays calm rather than multicoloured. */
const ART: Record<string, { bg: string; hi: string }> = {
  "#1a1916": { bg: "#fdfdfb", hi: "#eceae3" },
};

/**
 * A stand-in preview for an app with no screenshot: a small landing-page
 * sketch in the app's own colours, with its name and category. Decoration
 * only — nothing on it claims anything about the app.
 */
export function PreviewArt({ app }: { app: ShowcaseApp }) {
  let hash = 0;
  for (let i = 0; i < app.slug.length; i++) hash = (hash * 31 + app.slug.charCodeAt(i)) >>> 0;
  const acc = markColor(app.slug);
  const { bg, hi } = ART[acc] ?? ART["#1a1916"];
  const fg = "#0b0b0f";
  const kind = (["phone", "cards", "chart", "chat"] as const)[hash % 4];
  const title = app.name.length > 22 ? app.name.slice(0, 21) + "…" : app.name;
  const hl = (app.category ?? "your idea").toLowerCase();
  const hlw = Math.min(470, hl.length * 25 + 24);
  const id = `a${hash.toString(36)}`;

  const right = {
    phone: (
      <>
        <rect x="590" y="96" width="170" height="340" rx="30" fill="#0b0b0f" />
        <rect x="640" y="108" width="70" height="14" rx="7" fill="#222" />
        <rect x="604" y="240" width="142" height="62" rx="12" fill="#ffffff22" />
        <rect x="616" y="254" width="80" height="8" rx="4" fill="#fff8" />
        <rect x="616" y="272" width="110" height="6" rx="3" fill="#fff5" />
        <circle cx="618" cy="400" r="14" fill="#ffffff22" />
        <circle cx="732" cy="400" r="14" fill="#ffffff22" />
      </>
    ),
    cards: (
      <>
        <g transform="rotate(-6 670 270)">
          <rect x="560" y="120" width="210" height="140" rx="16" fill="#fff" stroke="#0001" />
          <rect x="580" y="140" width="80" height="80" rx="10" fill={acc} opacity=".85" />
          <rect x="672" y="148" width="80" height="10" rx="5" fill="#0002" />
          <rect x="672" y="168" width="54" height="10" rx="5" fill="#0001" />
        </g>
        <g transform="rotate(4 670 360)">
          <rect x="572" y="280" width="210" height="140" rx="16" fill="#fff" stroke="#0001" />
          <rect x="592" y="300" width="80" height="80" rx="10" fill={hi} />
          <rect x="684" y="308" width="80" height="10" rx="5" fill="#0002" />
          <rect x="684" y="328" width="40" height="18" rx="9" fill={acc} />
        </g>
      </>
    ),
    chart: (
      <>
        <rect x="560" y="110" width="210" height="320" rx="18" fill="#fff" stroke="#0001" />
        <rect x="580" y="136" width="70" height="10" rx="5" fill="#0002" />
        <rect x="580" y="160" width="90" height="22" rx="6" fill={fg} opacity=".85" />
        {[60, 110, 80, 150, 120, 170, 140].map((h, i) => (
          <rect key={i} x={582 + i * 26} y={400 - h} width="16" height={h} rx="5" fill={i === 5 ? acc : "#0000001a"} />
        ))}
      </>
    ),
    chat: (
      <>
        <rect x="560" y="100" width="210" height="340" rx="20" fill="#fff" stroke="#0001" />
        <rect x="580" y="130" width="130" height="40" rx="14" fill="#0000000d" />
        <rect x="620" y="186" width="130" height="52" rx="14" fill={acc} />
        <rect x="580" y="254" width="150" height="40" rx="14" fill="#0000000d" />
        <rect x="640" y="310" width="110" height="40" rx="14" fill={acc} />
        <rect x="576" y="390" width="178" height="34" rx="17" fill="#0000000a" />
      </>
    ),
  }[kind];

  const heading = { fontFamily: "Arial, sans-serif", fontWeight: 800, fontSize: 44, letterSpacing: -2 };
  return (
    <svg aria-hidden="true" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <pattern id={`${id}d`} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="#0000001a" />
        </pattern>
        <radialGradient id={`${id}g`} cx="85%" cy="50%" r="40%">
          <stop stopColor={hi} stopOpacity=".45" />
          <stop offset="1" stopColor={hi} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="520" fill={bg} />
      <rect width="800" height="520" fill={`url(#${id}d)`} />
      <rect width="800" height="520" fill={`url(#${id}g)`} />
      <rect x="50" y="34" width="18" height="18" rx="4" fill={acc} />
      <text x="78" y="49" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="17" fill={fg}>{title}</text>
      <rect x="640" y="30" width="110" height="26" rx="13" fill={fg} />
      <text x="50" y="140" {...heading} fill={fg}>Made with AI,</text>
      <rect x="46" y="160" width={hlw} height="58" rx="4" fill={hi} />
      <text x="58" y="204" {...heading} fill={fg}>{hl}</text>
      <text x="50" y="262" {...heading} fill={fg} opacity=".45">live on a link.</text>
      <rect x="50" y="296" width="380" height="11" rx="5.5" fill="#0000001f" />
      <rect x="50" y="318" width="290" height="11" rx="5.5" fill="#0000001f" />
      <rect x="50" y="356" width="160" height="40" rx={kind === "phone" ? 0 : 20} fill={fg} />
      <rect x="222" y="356" width="100" height="40" rx="20" fill="none" stroke="#00000026" />
      <rect x="50" y="420" width="470" height="64" rx="12" fill="#0b0b0f" />
      <rect x="70" y="440" width="300" height="8" rx="4" fill={hi} opacity=".85" />
      <rect x="70" y="458" width="200" height="8" rx="4" fill="#ffffff33" />
      {right}
    </svg>
  );
}

/**
 * Google Drive share links point at an HTML viewer page, not the image
 * bytes, so they don't work in a plain `<img>` as-is. Rewritten to Drive's
 * thumbnail endpoint, which serves the actual image and is what stays
 * reliable for larger files (the older `uc?export=view` form can return an
 * interstitial instead of the file). Anything else — including a direct
 * image URL — passes through untouched.
 */
export function resolveScreenshotUrl(url: string): string {
  const match = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
  return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000` : url;
}


/** An app's screenshot, or the drawn stand-in when it has none. Fills its box. */
export function Shot({ app, alt, eager }: { app: ShowcaseApp; alt?: string; eager?: boolean }) {
  if (!app.screenshotUrl) return <PreviewArt app={app} />;
  /* Plain img, not next/image: these are arbitrary third-party URLs from a
     public form, and routing them through the optimiser would make this site
     fetch whatever a submitter points it at. */
  return <ShotImage src={resolveScreenshotUrl(app.screenshotUrl)} alt={alt ?? ""} eager={eager} />;
}

/** "Ada Lovelace" → "Ada". Tiles have room for a first name only. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** "https://www.foo.embarko.app/" → "foo.embarko.app". */
export function hostOf(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

/* The letter mark beside each name. Decoration only, so the colour is seeded
   from the slug: stable between renders, and it never implies anything. */
const MARKS = ["#1a1916"];
export function markColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return MARKS[hash % MARKS.length];
}

export function Mark({ app }: { app: ShowcaseApp }) {
  return (
    <span aria-hidden="true" className="sc-mk" style={{ background: markColor(app.slug) }}>
      {app.name.trim()[0]?.toUpperCase()}
    </span>
  );
}

/**
 * A gallery tile.
 *
 * Everything on it is about the app: preview, name, what it does, who made it.
 * The whole tile opens the app's Showcase page (a stretched cover link), so
 * the creator gets the visit.
 */
export function Tile({ app, index = 0 }: { app: ShowcaseApp; index?: number }) {
  const meta = [app.category, `by ${firstName(app.creatorName)}`].filter(Boolean).join(" · ");
  return (
    <article className="sc-tile">
      <Link href={`/showcase/app/${app.slug}`} className="sc-cover" aria-label={`${app.name} — view app`} />
      <div className="th">
        <Shot app={app} />
        <span className="open" aria-hidden="true">
          View app <ArrowRight />
        </span>
      </div>
      <div className="bd">
        <div className="tt">
          <Mark app={app} />
          <h3>{app.name}</h3>
        </div>
        <p>{app.tagline}</p>
        <div className="ft">
          <span>{meta}</span>
          {app.builtWith && <span className="bw">Built with {app.builtWith}</span>}
        </div>
      </div>
    </article>
  );
}

export function TileGrid({ apps }: { apps: ShowcaseApp[] }) {
  return (
    <div className="sc-gal">
      {apps.map((app, i) => (
        <Tile key={app.id} app={app} index={i} />
      ))}
    </div>
  );
}

export function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="sc-steps">
      {steps.map((step, i) => (
        <li key={step}>
          <i>{i + 1}</i>
          {step}
        </li>
      ))}
    </ol>
  );
}

/** The closing section every gallery-style page ends on: go make one. */
export function DeployCta({ listPrompt = showcaseGeneralPrompt() }: { listPrompt?: string | null }) {
  /* Same words as the homepage (v4) hero, inside the card. */
  return (
    <section className="sc-mega" id="deploy" aria-labelledby="deploy-h">
      <Pill grad>
        <Sparkles aria-hidden="true" />
        Hosting for apps already built by your agent
      </Pill>
      <h2 id="deploy-h">
        Instant hosting for every app <br className="sc-br-wide" />
        you build with <span className="sc-serif">AI</span>
      </h2>
      <p>Your agent builds it. Embarko hosts it.</p>
      <div className="sc-ctas">
        <PrimaryCta />
      </div>
      <DsSteps />
      {listPrompt && (
        <p className="sc-list">
          Already live on Embarko?{" "}
          <CopyPromptButton className="sc-list-copy" text={listPrompt} copiedChildren={COPIED_LABEL}>
            Copy prompt to showcase your app
          </CopyPromptButton>
        </p>
      )}
    </section>
  );
}

/** Back link to the gallery, used at the top of every sub-page. */
export { BackLink as BackToShowcase } from "./BackLink";

/** Empty list on a category / tag / collection page. */
export function EmptyList({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="sc-gal">
      <div className="sc-empty">
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="acts">
          {action}
          <a href="#deploy" className="sc-btn pri">
            Build one <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
