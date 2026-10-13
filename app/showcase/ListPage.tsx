import { ShowcaseHeader } from "./ShowcaseHeader";
import { SiteFooter } from "../components/SiteFooter";
import { listCollections, type ShowcaseApp } from "../lib/showcase";
import { CustomHtml } from "../components/CustomHtml";
import { BackToShowcase, DeployCta, EmptyList, OtherPages, TileGrid } from "./kit";
import { ShareRow } from "./share";

/**
 * The shared frame for category, tag and collection pages: a compact hero,
 * the same tiles as the gallery, and the same closing CTA.
 */
export async function ListPage({
  title,
  lede,
  intro,
  actions,
  apps,
  empty,
  listPrompt,
  note,
  shareTitle,
  shareWhenEmpty = false,
  currentSlug,
  customHtml,
}: {
  title: string;
  lede?: string;
  intro?: string | null;
  actions?: React.ReactNode;
  apps: ShowcaseApp[];
  empty: { title: string; body: string; action?: React.ReactNode };
  listPrompt?: string | null;
  /** One line under the intro telling the visitor what to do here. */
  note?: string | null;
  /** Text for share posts. Share only shows once the page has apps: an
      empty page isn't worth sending anyone to. */
  shareTitle?: string;
  /** Show share even while empty — an event page is shared to invite
      participants before anything is listed. */
  shareWhenEmpty?: boolean;
  /** Slug of the page being viewed, left out of the "more pages" row. */
  currentSlug?: string;
  /** An event organiser's HTML block: rules, schedule, sponsors. Sits above
      the apps, since it is what a visitor needs before browsing them. */
  customHtml?: string | null;
}) {
  const pages = await listCollections();
  const html = customHtml?.trim();
  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      {/* An event page's header copies its own prompt, which names this page,
          so the visitor's AI lists the app here and not on the gallery. */}
      <ShowcaseHeader prompt={listPrompt ?? undefined} />
      <div className="sc-wrap sc-layer">
        <section className="sc-subhero">
          <BackToShowcase />
          <div className="sc-titlebar">
            <h1>{title}</h1>
            {shareTitle && (apps.length > 0 || shareWhenEmpty) && <ShareRow title={shareTitle} />}
          </div>
          {lede && <p className="sc-lede">{lede}</p>}
          {intro && <p className="sc-intro">{intro}</p>}
          {note && <p className="sc-note">{note}</p>}
          {actions && <div className="sc-row">{actions}</div>}
        </section>

        {html && (
          <section className="sc-custom-wrap" aria-label={`About ${title}`}>
            <CustomHtml html={html} title={`About ${title}`} />
          </section>
        )}

        <div className="mt-10">
          {apps.length > 0 ? <TileGrid apps={apps} /> : <EmptyList {...empty} />}
        </div>

        <OtherPages pages={pages} current={currentSlug} />
        <DeployCta listPrompt={listPrompt} />
      </div>
      <SiteFooter />
    </main>
  );
}
