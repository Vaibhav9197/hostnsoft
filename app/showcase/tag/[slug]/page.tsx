import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "../../../components/SiteHeader";
import { SiteFooter } from "../../../components/SiteFooter";
import { listAppsWithTag } from "../../../lib/showcase";
import { AppCard, BTN_PRIMARY, WRAP } from "../../kit";
import { ShareRow } from "../../share";
import { ShowcaseBreadcrumbs } from "../../breadcrumbs";

/**
 * A tag page: /showcase/tag/education. Every public app carrying that tag.
 * Tags are free text, so a tag page only exists while at least one app uses
 * it — an unused tag 404s rather than rendering an empty page.
 * `/tag/...` is a real directory so it matches before the catch-all.
 */

/* Per request, not prerendered: a build-time page would freeze the list. */
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await listAppsWithTag(slug);
  if (!found) return {};
  const { tag, apps } = found;

  return {
    title: `${tag} apps — Showcase`,
    description: `Apps tagged "${tag}", built with AI agents and hosted on Embarko. Browse ${apps.length} ${apps.length === 1 ? "project" : "projects"} and try them live.`,
    keywords: [`${tag.toLowerCase()} apps`, tag, "AI-built apps", "Embarko showcase"],
  };
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params;
  const found = await listAppsWithTag(slug);
  if (!found) notFound();
  const { tag, apps } = found;

  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <ShowcaseBreadcrumbs trail={[{ name: tag, path: `/showcase/tag/${slug}` }]} />
      <SiteHeader />

      <header className="py-[72px] max-[900px]:py-12">
        <div className={WRAP}>
          <Link
            href="/showcase"
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Showcase
          </Link>

          <h1 className="mt-6 max-w-[720px] text-[42px] font-semibold leading-[1.1] tracking-[-0.02em] max-[900px]:text-[32px]">
            #{tag}
          </h1>
          <p className="mt-4 text-[17px] text-muted-foreground">
            {apps.length} {apps.length === 1 ? "project" : "projects"} with this tag
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/app/showcase/submit" className={BTN_PRIMARY}>
              List your app here
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <ShareRow title={`${tag} apps — ${apps.length} projects on Embarko Showcase`} />
          </div>
        </div>
      </header>

      <section className="pb-[88px] max-[720px]:pb-[60px]">
        <div className={WRAP}>
          <div className="grid grid-cols-3 gap-6 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
