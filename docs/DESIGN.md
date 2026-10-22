---
covers: ["app/design.css", "app/base.css", "app/components/**", "app/layout.tsx", "app/lib/theme.tsx", "app/lib/themeScript.ts", "tailwind.config.js"]
verified_at: 105ccbb
verified_on: 2026-10-21
---
# Design rules for public pages

The Showcase (`/showcase`) is the visual standard for every public page. Its
look is extracted into a shared layer; build with it, don't re-create it.

- Tokens: `app/design.css` (`--ds-*` on `:root`, loaded by `app/layout.tsx`)
- Components: `app/components/ds` (import from `@/app/components/ds`)
- Serif accent font: `--font-ds-serif` (Instrument Serif italic, set on `<html>`)

Treat this as a checklist, like [SEO.md](SEO.md).

## Before any design work: load the UX skill

For any design, UI, layout, copy or visual change — a new page, a restyle, a
review, a critique — load the **`ux-design-expert`** skill first (Claude:
`Skill` tool, `anthropic-skills:ux-design-expert`). It holds the Walkover
product and website design philosophy: diagnose the product, user, risk and
go-to-market before choosing a layout, then apply its heuristics for flow,
typography, colour, composition, accessibility and microcopy.

Where they overlap, the order of authority is: `CLAUDE.md` (product rules) →
the `ux-design-expert` skill (design judgement) → this file (how Embarko
builds it: tokens, components, copy). The skill is an org skill on the team's
Claude account, not a file in this repo; if it isn't available in a session,
say so rather than skipping it silently.

## Colour rule

Colour comes from the original palette in `app/base.css`: cream `--bg`,
near-white `--surface`, warm ink `--ink`, greys `--ink-soft`/`--ink-faint`,
and `--ok` green only for a "Live" status. Typography and layout carry the
design; colour does not. Illustrations (mock screens, example-app sketches)
may use soft neutrals — no purple, pink or gradient accents anywhere.

Buttons are flat: no shadow, glow or lift. Primary is a solid ink pill,
secondary a bordered pill; hover changes colour, not depth.

## 1. Principles

- **Calm, minimal, premium.** Light cream ground, white cards, soft shadows,
  no brand hues — warm ink on cream, a faint warm wash at most. Lots of space.
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
| `--ds-v1` `--ds-v2` `--ds-v3` | Accent — all warm ink (`--ink`). Kept as names only; never add a hue |
| `--ds-grad` | Solid ink (was a gradient). Serif accent words read as plain ink |
| `--ds-grad-pill` | Unused by the eyebrow pill, which is now a light outlined chip (ink text, `--line-strong` border) |
| `--ds-lime`, `--ds-limeink` | Cream on ink (prompt caret) |
| `--ds-dark` | The one dark surface colour |
| `--ds-glow`, `--ds-glow-conic`, `--ds-glow-opacity` | Faint warm cream wash behind a section — never coloured |
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

**PrimaryCta** — the copy-prompt button. Large by default. `glow` defaults
to true but is visually inert: the flat-button rule at the end of
`app/design.css` sets `.ds-btn-glow::before` to `display:none`, so it renders
as the solid ink pill (changed in this doc on 2026-10-21 to match the code).
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
**Serif** — the italic accent word; `grad` adds `ds-gtext`, which is plain
ink now (the gradient was removed with the colour rule above).

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
| Cream, warm ink, lots of white space | Purple/pink glows, gradients, multicolour marks |
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

---

# Extended reference (added 2026-10-21, verified at 105ccbb)

Sections 1–8 above are the human-written public-page checklist and are kept
as written. What follows documents the rest of the frontend as the code does
it. Nothing here overrides `CLAUDE.md`.

## 9. Two stylesheets, one palette

| File | Loaded by | Role |
| --- | --- | --- |
| `app/base.css` | `app/layout.tsx` (every route) | Tailwind directives, the base palette (`--bg`, `--surface`, `--ink`, `--ok`…), the dark palette under `:root[data-theme="dark"]`, the beta-bar offset, a preflight-style reset |
| `app/design.css` | `app/layout.tsx` (every route) | The `--ds-*` tokens and `ds-` classes of sections 2–3 |

A third file, `app/globals.css`, held a legacy copy of the palette; nothing <!-- verify:ignore -->
imported it and it was deleted in the 2026-10-21 cleanup. Comments in
`app/base.css` and `app/components/LoginModal.css` still mention it by name.

Tailwind 3 (`tailwind.config.js`) maps every colour utility onto the base
vars: `bg-background`→`--bg`, `text-foreground`→`--ink`, `bg-card`→`--surface`,
`text-muted-foreground`→`--ink-soft`, `text-faint`→`--ink-faint`,
`bg-primary`→`--accent` (black in light, off-white in dark), `text-success`→`--ok`,
`text-destructive`→`--danger`, `border-input`→`--line-strong`,
`border-control`→`--line-control`. `borderRadius` is forced to `0px` for
every Tailwind size, so `rounded-lg` draws a sharp corner in the panel; only
`rounded-full` rounds. Fonts: `font-sans`→`--font` (Inter stack, not loaded
via next/font — it falls through to system fonts unless installed),
`font-mono`→`--mono`. The only next/font is Instrument Serif
(`app/layout.tsx:serif`), exposed as `--font-ds-serif`.

> [!WARNING]
> `app/base.css` restates `html .text-success { color: var(--ok) !important }`
> because the MSG91 login widget injects a global `.text-success` rule that
> otherwise greys every Live badge for the session. Do not remove it.

## 10. Panel (/app) and admin (/admin) vs public pages

Public pages use the `ds-` layer (sections 1–8). The signed-in panel and
admin use Tailwind utilities plus two component sets:

- `app/components/ui/` — shadcn-style primitives (Radix + `class-variance-authority`),
  joined with `app/lib/utils.ts:cn`.
- `app/components/console/` — panel pieces. `app/components/console/kit.tsx`
  holds the layout primitives: `Page`, `PageHeader`, `Panel`, `PanelTitle`,
  `EmptyState`, `Alert`, `Toast`, `FactGrid`/`Fact`, `Skeleton`,
  `NativeSelect`, `LinkButton`, `Tag`, `Steps`.

Shell: `app/app/layout.tsx` injects `app/lib/themeScript.ts:THEME_SCRIPT`
then renders `app/app/console-shell.tsx:ConsoleShell` (ThemeProvider →
SessionProvider → BillingProvider → Shell). `Shell` branches on session
status: loading spinner (`role="status"`), anonymous → `LoginScreen`, no
company → bare header with `HeaderUserMenu`, otherwise a borderless 56px
header (`HeaderUserMenu` left, `HeaderPlanBadge` right), `ConsoleBreadcrumbs`,
the page, and `FeedbackWidget`. Toasts are `sonner` via
`app/components/ui/sonner.tsx`, lifted 80px on phones to clear the feedback
launcher.

Login: `app/components/console/LoginScreen.tsx:LoginScreen` is a centred
`bg-card` card on `bg-background` with the MSG91 widget inside
`.login-widget`; it follows the OS theme like the rest of the panel (it is
not a fixed dark screen). The `.login-widget proxy-auth` rule in
`app/base.css` centres the widget's fixed-width buttons.

Home: `app/app/page.tsx` renders `app/components/console/CloudBackdrop.tsx:CloudBackdrop`
(sky photos from `public/atmosphere/`) behind `AppTile` cards, which reuse the
Showcase tile classes from `app/showcase/showcase.css` (`.sc > .sc-gal`). This
is the one place the panel borrows `.sc-*` on purpose — the rule in section 7
("don't copy `.sc-*`") is about public pages re-creating the Showcase look.

Admin: `app/admin/layout.tsx` repeats the same inline theme script (a local
copy, not the import) and wraps pages in `ThemeProvider`; pages gate through
`app/admin/guard.tsx` and use `app/components/AdminNav.tsx:AdminNav`. Admin
has no design layer of its own — plain Tailwind on the base palette.

## 11. Status vocabulary

The product uses three words (CLAUDE.md §7): **Live · Not online · Needs
attention**. Where the code renders them:

| Surface | Component | Words rendered |
| --- | --- | --- |
| App card, app page | `app/components/console/HealthPill.tsx:HealthPill` | `Running` / `Starting` / `Deploying` / `Not online` / `Needs attention` / `Unknown` |
| Deployment rows, domains, members | `app/components/console/StatusPill.tsx:StatusPill` | `app/lib/format.ts:STATUS_LABEL` (Success / Failed / In progress / Active / Invited…), overridable per caller |
| Deployment history "current" marker | `app/components/console/kit.tsx:Tag` | `Live` |
| Deploy flow stages | `app/components/console/DeploySteps.tsx` | Started → Built → Live |

Rules the code enforces: `HealthPill` is the only place that names project
health (`STATUS_LABEL` deliberately omits it); colour never carries meaning
alone — every pill has the word, and `labelOnHover` still keeps the word in
the DOM and always shows it for "Needs attention"; "wait" states (Starting,
Deploying) get motion (`animate-ping`), not a fourth colour. A running app
with a failing schedule shows "Needs attention".

> [!TODO]
> `HealthPill` renders **Running** for a healthy app while `CLAUDE.md` §7,
> `app/lib/system/story.ts` and the deployments page say **Live**. Which word
> is canonical for the card is a product call; the code currently disagrees
> with itself.

## 12. Dark mode

- The OS decides; there is no picker and nothing is stored.
- `app/lib/themeScript.ts:THEME_SCRIPT` runs inline before paint in
  `app/app/layout.tsx` and `app/claim` and writes `data-theme="light|dark"`
  on `<html>` from `prefers-color-scheme`.
- `app/lib/theme.tsx:ThemeProvider` keeps it in sync (listens to the media
  query) and **removes the attribute on unmount**, so client navigation back
  to marketing pages returns to the cream ground. `app/lib/theme.tsx:useTheme`
  exposes the resolved value.
- CSS keys off the attribute: `:root[data-theme="dark"]` in `app/base.css`
  swaps every base var; `app/design.css` only lowers `--ds-glow-opacity`.
  Tailwind `darkMode` is `["selector", '[data-theme="dark"]']`, so `dark:`
  variants follow the same attribute.
- `app/layout.tsx` sets `suppressHydrationWarning` on `<html>` for exactly
  this attribute. Marketing pages carry no attribute and stay light even on
  a dark OS.

## 13. Responsive breakpoints

- Tailwind defaults in TSX (`sm:` 640px is by far the most used, then `md:`,
  `max-sm:`, `lg:`; `xl:` three times). No custom screens in
  `tailwind.config.js`.
- `app/design.css`: `max-width:600px` (gutter 16px, hero padding) and
  `pointer:coarse` (44px small buttons).
- Page CSS files (`app/showcase/showcase.css`, `app/v3`–`v5`, `app/guides/**`,
  `app/pages/pages.css`) use ad-hoc `max-width` points — 1100, 960, 900, 760,
  640, 600, 560, 520, 480px — per grid. There is no shared breakpoint scale
  beyond Tailwind's; check 375px (section 6) rather than a named step.
- Print: `app/guides/**/scenes.css` hide interactive demo parts under `@media print`.

## 14. Accessibility practices observed

- `aria-hidden` on decorative art and button icons (~300 uses), `aria-label`
  on icon-only controls, `aria-live` on status regions (the shell spinner,
  deploy progress), `aria-labelledby` on sections, `aria-pressed` on toggles,
  `aria-invalid` on fields, `aria-current` on nav.
- `sr-only` text supplements visual state (`HealthPill` adds ", in progress"
  and ": a scheduled job is failing").
- Focus: `.ds-btn:focus-visible` / `.ds-pill:focus-visible` outline in
  `app/design.css`; `app/components/ui/button.tsx` uses `focus-visible:ring`.
- Contrast was tuned on purpose: `--ink-faint` darkened to 4.6:1,
  `--line-control` added for 3:1 control edges, `--ok-ink` for green text
  (comments in `app/base.css`). Keep these when adding tokens.
- Reduced motion: `app/design.css` zeroes all `ds-` animation; `app/base.css`
  stops `[data-mic-pulse]`; guide scenes hide replay controls.
- No skip link exists (grep for "Skip to" finds none).

## 15. Icons

- `lucide-react` is the icon set (≈70 import sites). Wrap with `aria-hidden`
  unless the icon is the only label.
- `simple-icons` for third-party brand marks, used only in `app/v4/page.tsx`
  and `app/guides/BlogShare.tsx`.
- AI-agent marks are static SVGs in `public/agenticons/agenticon-<slug>.svg`,
  resolved by `app/lib/agents.ts`.
- The prompt button icon is `app/components/CopyPromptButton.tsx:PromptIcon` (WandSparkles).

## 16. Microcopy conventions (panel)

- Every copy-prompt control routes through
  `app/components/CopyPromptButton.tsx:CopyPromptButton`; the copied label is
  `COPIED_LABEL` ("Paste in your agent"). The prompt text lives in
  `app/lib/deployPrompt.ts`.
- Destructive or notable actions go through
  `app/components/console/ConfirmDialog.tsx:ConfirmDialog`, phrased in the
  words the user needs to decide.
- Empty states use `app/components/console/kit.tsx:EmptyState` or, for zero
  apps, `app/components/console/FirstAppEmpty.tsx:FirstAppEmpty`, which asks
  one question and leads into `DeploySteps`.
- Errors are `Alert variant="err"`; the API-unreachable banner text is set
  once in `console-shell.tsx`. Use CLAUDE.md §12 words; never provision,
  runtime, artifact.

## 17. Reusable component catalog

**Public (`app/components/ds/`)** — see section 3 for usage.

| Component | File | Notes |
| --- | --- | --- |
| `ButtonLink`, `buttonClass` | `app/components/ds/Button.tsx` | variants primary/glow/secondary/ghost, sizes sm/md/lg |
| `PrimaryCta` | `app/components/ds/PrimaryCta.tsx` | client; wraps `CopyPromptButton` |
| `Hero`, `Section`/`SectionHeading`, `Card`, `GlowBackdrop`, `Steps`, `CtaSection`, `Pill`, `Serif` | `app/components/ds/` | server components; re-exported by `app/components/ds/index.ts` |

**Site chrome (`app/components/`)**

| Component | File | Importers |
| --- | --- | --- |
| `SiteHeader` (Header + login modal) | `app/components/SiteHeader.tsx` | 13 |
| `Header` | `app/components/Header.tsx` | 4 (prefer `SiteHeader`) |
| `SiteFooter` | `app/components/SiteFooter.tsx` | 16 |
| `BetaBanner` | `app/components/BetaBanner.tsx` | root layout; hidden in panel/admin, sets `--beta-bar-h` via `[data-beta-bar]` |
| `CopyPromptButton` | `app/components/CopyPromptButton.tsx` | 17 |

**shadcn-style primitives (`app/components/ui/`)** — importer counts from
`grep -rlE "/ui/<name>['\"]" app` excluding the file itself (2026-10-21).

| File | Importers | Status |
| --- | --- | --- |
| `app/components/ui/button.tsx` | 32 | in use (variants default/destructive/outline/secondary/ghost/link) |
| `app/components/ui/input.tsx` | 14 | in use |
| `app/components/ui/dialog.tsx` | 13 | in use (ConfirmDialog, FeedbackWidget…) |
| `app/components/ui/table.tsx` | 5 | in use |
| `app/components/ui/tooltip.tsx` | 4 | in use |
| `app/components/ui/sheet.tsx`, `app/components/ui/dropdown-menu.tsx`, `app/components/ui/dictation.tsx` | 2 each | in use |
| `app/components/ui/alert.tsx` (UploadDeployPanel), `app/components/ui/chart.tsx` (ProjectAnalytics), `app/components/ui/tabs.tsx` (DeployPromptDialog), `app/components/ui/popover.tsx` (FeedbackWidget), `app/components/ui/kbd.tsx` (v1), `app/components/ui/sonner.tsx` (console-shell) | 1 each | in use |
| (removed) `separator.tsx`, `skeleton.tsx`, `sidebar.tsx`, `switch.tsx` | — | Deleted 2026-10-21/22 as unimported; the panel's skeleton is `app/components/console/kit.tsx:Skeleton` <!-- verify:ignore --> |

**Console (`app/components/console/`)**

| Component | Purpose |
| --- | --- |
| `app/components/console/DeploySteps.tsx:DeploySteps` | The four-step "get it online" flow (key → copy prompt → paste → live) |
| `app/components/console/DeployPromptDialog.tsx:DeployPromptDialog` | Shared "Deploy an app" / redeploy dialog |
| `app/components/console/ProjectNav.tsx:ProjectNav` | App identity + section tabs above every project page |
| `app/components/console/HeaderUserMenu.tsx:HeaderUserMenu` | Account/workspace dropdown; `AccountMenu` is the inner menu |
| `app/components/console/HeaderPlanBadge.tsx:HeaderPlanBadge` | Plan chip / Upgrade pill, right of the header |
| `app/components/console/LoginScreen.tsx:LoginScreen` | MSG91 sign-in card |
| `app/components/console/HealthPill.tsx:HealthPill`, `app/components/console/StatusPill.tsx:StatusPill` | Status badges (section 11) |
| `app/components/console/AppTile.tsx:AppTile`, `CreateAppTile` | Cards on "Your apps" |
| `app/components/console/FirstAppEmpty.tsx:FirstAppEmpty` | Zero-apps state |
| `app/components/console/ConfirmDialog.tsx:ConfirmDialog` | Confirmation dialog |
| `app/components/console/FeedbackWidget.tsx:FeedbackWidget` | Bottom-right feedback launcher |
| `app/components/console/CloudBackdrop.tsx:CloudBackdrop` | Sky behind the apps list |

## 18. SEO and docs writing — summary

Full rules: [SEO.md](SEO.md) (public pages) and [WRITING.md](WRITING.md)
(`/docs` guide and `content/docs/`). In five lines:

1. Every public page sets its own `title` (template `%s · Embarko` from `app/layout.tsx`), description and keywords.
2. Canonical is automatic (`alternates: { canonical: "./" }` in the root layout); don't override it.
3. Index by default; be explicit with `robots` when a page must not be indexed.
4. Open Graph image is the committed `public/assets/opengraph.png` — never a generated image route (production has no filesystem).
5. Structured data: Organization + SoftwareApplication once in `app/layout.tsx:STRUCTURED_DATA`; pages with hierarchy add `BreadcrumbList`.
