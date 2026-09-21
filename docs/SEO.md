# SEO rules for this codebase

Every public page must follow these rules before it ships. This is not
background reading — treat it like a checklist when you add or touch a page
under `app/`. If a page violates a rule below, fix it in the same PR.

"Public page" means anything reachable without signing in: the marketing
site, `/pricing`, `/docs/*`, `/showcase/*`, legal pages, etc. It excludes
`/app/*` (console), `/admin/*`, `/api/*`, `/connector/*`, and the `/v1../v4`
landing-page A/B variants (those inherit rules from `app/lib/landingMetadata.ts`
and must never be treated as standalone pages — see rule 7).

## 1. Every page needs its own `<title>` and description

Add a `metadata` export (or `generateMetadata` for dynamic routes):

```ts
export const metadata: Metadata = {
  title: "Pricing",
  description: "One sentence, under ~155 characters, written for a human, not a keyword list.",
};
```

- **Do not include "Embarko" in the title.** The root layout's
  `title.template` (`app/layout.tsx`) appends it automatically as
  `"%s · Embarko"`. Writing `"Pricing | Embarko"` yourself produces
  `"Pricing | Embarko · Embarko"`.
- The one exception is the homepage and the landing-page variants, which use
  an absolute title (see rule 7) because the brand leads the sentence itself.
- Description is unique per page. Never copy the root layout's default
  description onto a real page — that default exists only as a fallback for
  pages that forget to set one, and a page reusing it is a page that forgot.
- No page should render with the fallback title/description. If you add a
  route and don't set `metadata`, that is a bug, not an acceptable default.

## 2. Every page needs its own keywords

```ts
export const metadata: Metadata = {
  keywords: ["term a user would actually search", "3 to 7 total"],
};
```

Google has not used this tag for ranking since 2009 — it costs nothing and
some other engines still read it, but do not expect it to move rankings.
Do not spend time optimizing keyword lists; a short, honest list is enough.
See existing pages (`app/pricing/page.tsx`, `app/security/page.tsx`, etc.)
for the pattern. Docs pages get keywords from the `keywords` field in
`app/lib/docs.ts`, not inline.

## 3. Canonical URL is automatic — don't fight it

The root layout sets `alternates: { canonical: "./" }`, which resolves to
each page's own URL against `metadataBase` (`SITE` from `app/lib/site.ts`,
currently `https://embarko.ai`). Every page canonicalizes to itself by
default. **Do not** set a page-specific `alternates.canonical` unless the
page is a genuine duplicate of another URL (e.g. a paginated view that
should canonicalize to page 1). If you find yourself doing that, ask whether
the duplicate should exist at all instead.

The canonical host is the bare apex, `embarko.ai`, not `www`. `www.embarko.ai`
308-redirects to the apex in `next.config.mjs` — never point anything at the
`www` host on purpose.

## 4. Robots: index by default, be explicit when you don't want to

The root layout sets a permissive default (`index: true, follow: true`,
large image previews, unlimited snippet length). Leave it alone unless the
page is genuinely thin or not ready for search:

```ts
// A page with nothing on it yet (e.g. an empty showcase collection).
robots: { index: false, follow: true },
```

See `app/showcase/[...collection]/page.tsx` for the working example: it
flips to `noindex` only when the collection has zero public apps, and
reverts automatically once one is added. Never hand-maintain a permanent
noindex list — derive the decision from real page state.

Signed-in routes (`/app`, `/admin`) and the API are blocked at the `robots.ts`
level (`disallow`), not per-page. Don't add per-page noindex to console pages
— they're already out of the crawl.

## 5. Open Graph and Twitter cards

The root layout sets site-wide defaults: `siteName: "Embarko"`, a
`summary_large_image` Twitter card, and the shared preview image at
`public/assets/opengraph.png`. Most pages should do nothing extra.

Set your own `openGraph`/`twitter` block only when the page has something
better to show:

```ts
openGraph: {
  title: app.name,
  description: app.tagline,
  images: app.screenshotUrl ? [app.screenshotUrl] : undefined, // falls back to the default card if absent
},
```

**The OG image must be a static file, not a generated route.** Production
runs on a Cloudflare Worker via OpenNext with no filesystem and no
incremental cache configured. A `next/og` `ImageResponse` route
(`opengraph-image.tsx`) gets re-executed on every request there and 500s —
it worked in `next dev` and broke in production. If a page needs a custom
card, generate the PNG once (locally, or in a script) and commit it under
`public/assets/`, the way `app/layout.tsx` and
`app/lib/landingMetadata.ts` do. Do not reintroduce `app/opengraph-image.tsx`.

## 6. Structured data (JSON-LD)

Site-wide `Organization` and `SoftwareApplication` schema is already emitted
once, in the root layout (`app/layout.tsx`). Don't duplicate it on
individual pages.

Add page-specific structured data only when the page has something a
generic Organization schema doesn't cover:

- Docs pages emit `BreadcrumbList` in `app/docs/renderDoc.tsx` — follow that
  pattern (one `<script type="application/ld+json">`, computed from the
  page's real path) for any other page with a clear hierarchy.
- Showcase app pages emit `SoftwareApplication` schema in
  `app/showcase/app/[slug]/page.tsx`, scoped to that one app (name,
  description, author, category, video) — follow that pattern for any other
  page that represents one specific real-world thing rather than a section
  of the site.

Never hand-write JSON-LD with a template string. Build the object and
`JSON.stringify` it, so it can't be broken by an unescaped quote in a title
or description.

**Use every field you actually capture.** A field collected on a submit form
but never rendered on the public page (Showcase's `videoUrl` sat unused for
weeks) is invisible to both users and crawlers — collecting it accomplished
nothing. Before adding a new field to any content model, check whether an
existing one is already going unrendered; the fix is often "show what's
already there," not "collect more." The same applies to text length limits:
`whatItDoes` was capped at 600 characters when it is the page's actual
description, not a caption. If a "description"-shaped field is capped short
enough that a real paragraph doesn't fit, the cap is the bug.

## 7. The `/v1../v4` landing-page A/B test is one page, not four

`/` is rewritten (never redirected) by `middleware.ts` to one of `/v1` through
`/v4`. All four must carry **identical** title, description, and social tags
— they're the same page in Google's eyes, competing for the same canonical
URL. That shared metadata lives in `app/lib/landingMetadata.ts`. If you add a
new arm or change the homepage's positioning:

- Edit `app/lib/landingMetadata.ts`, not the individual arm's layout.
- Every arm layout should just do `export const metadata = LANDING_METADATA;`
- Once the test concludes and one arm wins, delete the others, delete the
  middleware rewrite, and move that arm's content to `app/page.tsx` directly.
  Don't leave a permanent 4-way split — Google's guidance is to conclude
  tests and settle on one version.

Direct hits on `/v1`..`/v4` (not through `/`) get `X-Robots-Tag: noindex` from
the same middleware, and are deliberately left out of `robots.ts`'s allow
list reasoning — they must never rank as separate pages. Don't do anything
that makes them independently indexable.

## 8. Sitemap: static pages are hardcoded, dynamic content is fetched

`app/sitemap.ts` runs on every request (`force-dynamic`) because it lists
Showcase apps and collections, which change without a deploy. If you add a
new static public page (e.g. a new legal page), add it to the `pages` array
in that file by hand — it will not appear automatically. If you add a new
kind of dynamic public content (anything else backed by the database or an
API), add a fetch for it the same way the Showcase entries are built:
fetched inside a try/catch that degrades to an empty list, never one that
can throw and 500 the whole sitemap.

Do not add `lastModified: new Date()` (or any build-time timestamp) to a
static page — it tells Google the page changed on every deploy, and Google
learns to ignore a date that's always "now." Only set `lastModified` when
you have a real modified date for that specific piece of content (Showcase
entries use their real `createdAt`).

Do not add to the sitemap: `/app/*`, `/admin/*`, `/connector/*`, the
`/v1../v4` variants, or any page currently marked noindex.

## 9. Redirects: permanent, not client-side

If a URL moves, add a real redirect in `next.config.mjs`'s `redirects()`,
with `permanent: true` (308). Do not solve a moved-page problem with a
client-side `router.push`, a meta-refresh, or a "click here" interstitial —
none of those pass link equity to the new URL and all of them read as soft
404s to crawlers. See the existing `/doc` → `/docs` and
`/limitations-and-recommendations` → `/docs/limitations` entries for the
pattern, including the comments explaining *why* each one has to keep
working (deploy tooling and old shared links reference the old path
directly and can't be edited after the fact).

## 10. One canonical host — never build a second one

`embarko.ai` is the only host that should ever serve real, indexable pages.
`www.embarko.ai` is bound to the same Worker and 308-redirects to the apex
in `next.config.mjs`. If a new domain or subdomain is ever pointed at this
app (a custom domain feature, a staging alias, etc.), it must either
redirect to `embarko.ai` or emit `noindex` — never serve the same content as
a crawlable 200. A second live host is exactly how the "Duplicate without
user-selected canonical" Search Console issue happened before; it recurs
identically for any new host that isn't handled the same way.

## 11. User-submitted links get `rel="nofollow ugc"`

Any URL a user typed into a form and we render as a link — a Showcase app's
live URL, its video, the creator's profile — is user-generated content. Mark
it `rel="noreferrer nofollow ugc"` so the site never vouches for, or passes
link equity to, whatever was pasted. Links we chose ourselves (docs, partner
sites) stay plain. See `app/showcase/app/[slug]/page.tsx`.

## 12. Pages with a hierarchy emit `BreadcrumbList`

Docs and every Showcase page (app, category, collection) emit breadcrumb
JSON-LD so results can show "Embarko › Showcase › App" instead of a bare URL.
Reuse `app/showcase/breadcrumbs.tsx` or the pattern in
`app/docs/renderDoc.tsx` for any new section that sits under a parent page.

## Quick checklist for a new page

- [ ] `metadata` (or `generateMetadata`) with a unique `title` (no "Embarko"
      in it) and description
- [ ] `keywords` — 3 to 7 real search terms
- [ ] No custom `alternates.canonical` unless this page is a deliberate
      duplicate of another
- [ ] `robots` untouched unless the page is genuinely thin/unready
- [ ] No `opengraph-image.tsx` — use a committed PNG under `public/assets/`
      if the default card doesn't fit
- [ ] Added to `app/sitemap.ts` if it's static; fetched safely if it's
      dynamic
- [ ] User-submitted links carry `rel="nofollow ugc"`; pages under a parent
      emit `BreadcrumbList`
- [ ] Verify locally: `curl -s http://localhost:3000/your-path | grep -o '<title>[^<]*\|<meta name="description"[^>]*>\|<meta name="keywords"[^>]*>\|<link rel="canonical"[^>]*>'`

## Related

- `CLAUDE.md` — the panel's UX principles (this doc doesn't override anything
  there; SEO changes should never add technical UI back into the product to
  satisfy a crawler)
- `app/layout.tsx` — site-wide defaults every page inherits
- `app/lib/site.ts` — the canonical origin (`SITE`)
- `app/lib/landingMetadata.ts` — shared homepage/A-B-test metadata
- `app/sitemap.ts`, `app/robots.ts` — what gets crawled and listed
