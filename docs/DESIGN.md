# Design rules for public pages

The Showcase (`/showcase`) is the visual standard for every public page. Its
look is extracted into a shared layer; build with it, don't re-create it.

- Tokens: `app/design.css` (`--ds-*` on `:root`, loaded by `app/layout.tsx`)
- Components: `app/components/ds` (import from `@/app/components/ds`)
- Serif accent font: `--font-ds-serif` (Instrument Serif italic, set on `<html>`)

Treat this as a checklist, like [SEO.md](SEO.md).

## 1. Principles

- **Calm, minimal, premium.** Light cream ground, white cards, soft shadows,
  one gentle purple/pink glow. Lots of space.
- **One primary action per section.** It is almost always *Copy deployment
  prompt*. At most one secondary button next to it.
- **User language.** Live, Open app, Deploy, Update, Fix with your AI. Never
  provision, runtime, infrastructure, artifact.
- **The AI does the work.** Pages explain; the prompt does the job. No curl,
  tokens, API URLs or headers on marketing pages.
- **Nothing fake.** No invented numbers, counters, logos, testimonials or
  "live" tickers. If it isn't real data, leave it out.
- **No heavy dashboards, server diagrams, or dark developer styling.** Dark
  surfaces are for small accents only (a prompt bar, a spotlight card).

## 2. Tokens

| Token | Use |
| --- | --- |
| `--ds-card`, `--ds-soft` | Card surface, softer inset surface |
| `--ds-line`, `--ds-line2` | Hairline border, stronger border |
| `--ds-ink`, `--ds-mute`, `--ds-dim` | Text: main, secondary, faint |
| `--ds-v1` `--ds-v2` `--ds-v3` | Brand violet-blue, purple, pink |
| `--ds-grad` | Brand gradient (buttons' glow, gradient text) |
| `--ds-grad-pill` | Deeper gradient for the eyebrow pill |
| `--ds-lime`, `--ds-limeink` | Rare highlight (prompt caret) |
| `--ds-dark` | The one dark surface colour |
| `--ds-glow`, `--ds-glow-conic`, `--ds-glow-opacity` | Soft backdrop glows (opacity drops in dark theme) |
| `--ds-r` (22px), `--ds-r-lg` (34px), `--ds-r-pill` | Radii: card, big panel, pill/button |
| `--ds-sh`, `--ds-sh2` | Resting shadow, lifted/hover shadow |
| `--ds-ease` | The one easing curve |
| `--ds-serif` | Serif accent font stack |
| `--ds-wrap` (1240px), `--ds-gutter` (24px, 16px ≤600px) | Page column |
| `--ds-chapter` | Space between major sections, `clamp(88px,10vw,144px)` |
| `--ds-top` | Height of beta bar + fixed header, for sticky offsets |

Theme colours read the base tokens in `app/base.css`, so light/dark follows
the site. Never hard-code a hex that a token covers.

## 3. Components

All are server components except `PrimaryCta` (client). Classes are prefixed
`ds-` and need no wrapper element.

**Hero** — top of a page. One per page.

```tsx
<Hero
  eyebrow="No signup to start"            // optional pill
  title={<>Deploy any app.<br /><Serif grad>Live</Serif> in a minute.</>}
  sub="Your AI builds it. Embarko puts it online."
  actions={<><PrimaryCta /><ButtonLink href="/showcase" size="lg">See apps</ButtonLink></>}
  steps                                     // true = default steps, or string[]
/>
```

**PrimaryCta** — the copy-prompt button. Glowing, large by default.
Props: `size`, `glow`, `onClicked` (analytics), `onCopied`, `label`, `text`.
Because it takes function props, pass `onClicked` only from a client component.

```tsx
<PrimaryCta onClicked={() => track("cta_hero")} />
```

**ButtonLink / buttonClass** — any other button. Variants `primary | glow |
secondary | ghost`, sizes `sm | md | lg`. Use `buttonClass()` for a
`<button>` or a third-party element.

```tsx
<ButtonLink href="/pricing">See pricing</ButtonLink>
<button className={buttonClass("ghost", "sm")}>More</button>
```

**Section + SectionHeading** — every block below the hero. Section adds the
chapter spacing and the page column (`wrap={false}` to opt out).

```tsx
<Section labelledBy="how-h">
  <SectionHeading id="how-h" kicker="01 — How it works" title="Three steps." sub="Nothing to set up." />
  ...
</Section>
```

**Card** — white rounded tile. `lift` only when the whole card is a link.
`as="article" | "li"` for semantics.

**GlowBackdrop** — soft radial glow behind a section. `position` =
`bottom | top | full`. Hero, Section and CtaSection are already valid parents; anywhere else the
parent needs `position:relative; isolation:isolate`. One per screen, max.

**Steps** — quiet mono row: *Copy → Paste into your agent → Share your link*.
Sits under a CTA row with 28px space. `steps` to override.

**CtaSection** — the closing band every public page ends on (pill, big
heading with one serif word, one line, PrimaryCta, Steps). All props
optional: `id`, `pill`, `title`, `line`, `steps`, `action`.

```tsx
<CtaSection />
```

**Pill** — small label. `grad` for the one eyebrow; `href` for chips.
**Serif** — the italic accent word; `grad` for gradient text.

## 4. Copy rules

- Primary CTA label: **Copy deployment prompt** (the default). Don't vary it.
- Copied state: `COPIED_LABEL` from `CopyPromptButton` — never write it inline.
- Steps: **Copy → Paste into your agent → Share your link**.
- Headlines: short, two lines max, exactly **one** serif word.
- Sub lines: one sentence, ≤ 2 lines on desktop.
- Kickers: `01 — Topic`, mono, uppercase is automatic.

## 5. Layout rhythm

- Content in `.ds-wrap` (1240px, 24px gutter; 16px on phones).
- Sections are separated by `--ds-chapter`. Don't add ad-hoc margins between
  sections; inside a section use 8/12/18/24/32px steps.
- Page order: Hero → 2–5 Sections → CtaSection → SiteFooter.
- The page sits under the fixed beta bar and header: use `pt-16` on `<main>`
  (body already pads `--beta-bar-h`) and `--ds-top` for any sticky element.

## 6. Mobile and a11y

- Check 375px wide: no horizontal scroll, buttons wrap, text never overflows
  (`min-width:0` on grid/flex children, `overflow-wrap:anywhere` on long names).
- Touch targets ≥ 44px (`ds-btn-sm` grows on coarse pointers).
- `prefers-reduced-motion` turns off all `ds-` animation — keep motion
  decorative only.
- One `<h1>` per page (Hero). Sections use `aria-labelledby` their `<h2>`.
- Decorative art gets `aria-hidden`. Icons in buttons get `aria-hidden`.
- Focus rings are visible (`--ds-v1` outline). Don't remove them.

## 7. Do / Don't

| Do | Don't |
| --- | --- |
| Use `app/components/ds` and `--ds-*` | Copy `.sc-*` classes or hard-code hexes |
| One PrimaryCta per section | Two competing primary buttons |
| Real apps, real screenshots | Fake stats, counters, logos, quotes |
| One glow, lots of white space | Aurora + grid + glow + gradients all at once |
| Plain words the user would say | Hosting jargon, API details, curl |
| End every page with `CtaSection` | End on a link list or a dense table |

## 8. Building a new public page

1. Follow [SEO.md](SEO.md) (metadata, canonical, keywords).
2. `<main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">`
   with `<SiteHeader />` first and `<SiteFooter />` last.
3. Start with `<Hero>` — one serif word, PrimaryCta.
4. Body as `<Section>` + `<SectionHeading>`; cards via `<Card>`.
5. End with `<CtaSection />`.
6. Page-specific CSS only for what the ds layer lacks; prefix it, read
   `--ds-*` tokens, and if two pages need it, add it to `ds` instead.
7. Check 375px, dark theme, reduced motion, and the console for errors.
