import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import type { ShowcaseApp } from "../lib/showcase";
import { BackToShowcase, DeployCta, EmptyList, TileGrid } from "./kit";

/**
 * The shared frame for category, tag and collection pages: a compact hero,
 * the same tiles as the gallery, and the same closing CTA.
 */
export function ListPage({
  title,
  lede,
  intro,
  actions,
  apps,
  empty,
  listHref,
}: {
  title: string;
  lede: string;
  intro?: string | null;
  actions: React.ReactNode;
  apps: ShowcaseApp[];
  empty: { title: string; body: string; action?: React.ReactNode };
  listHref?: string | null;
}) {
  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <SiteHeader />
      <div className="sc-aurora" aria-hidden="true" style={{ height: 520, opacity: 0.7 }}>
        <i />
        <i />
        <i />
      </div>
      <div className="sc-wrap sc-layer">
        <section className="sc-subhero">
          <BackToShowcase />
          <h1>{title}</h1>
          <p className="sc-lede">{lede}</p>
          {intro && <p className="sc-intro">{intro}</p>}
          <div className="sc-row">{actions}</div>
        </section>

        <div className="mt-10">
          {apps.length > 0 ? <TileGrid apps={apps} /> : <EmptyList {...empty} />}
        </div>

        <DeployCta listHref={listHref} />
      </div>
      <SiteFooter />
    </main>
  );
}
