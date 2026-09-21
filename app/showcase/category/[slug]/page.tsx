import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "../../../components/SiteHeader";
import { SiteFooter } from "../../../components/SiteFooter";
import { categoryFromSlug, listAppsInCategory } from "../../../lib/showcase";
import { AppCard, BTN_GHOST, BTN_PRIMARY, WRAP } from "../../kit";
import { ShareRow } from "../../share";

/**
 * A category page: /showcase/category/ai-tool. Every public app in one
 * category, wherever it was listed from. `/category/...` is a real directory
 * so it matches before the `[...collection]` catch-all.
 */

/* Per request, not prerendered: a build-time page would freeze the list. */
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) return {};
  const apps = await listAppsInCategory(category);

  return {
    title: `${category} apps — Showcase`,
    description: `${category} apps built with AI agents and hosted on Embarko. Browse ${apps.length} ${apps.length === 1 ? "project" : "projects"} and try them live.`,
    keywords: [`${category.toLowerCase()} apps`, "AI-built apps", "Embarko showcase", category],
    /* A category nobody has listed under yet is a thin page. It resolves,
       so links to it never break — search engines are just asked to wait. */
    robots: apps.length > 0 ? undefined : { index: false, follow: true },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) notFound();

  const apps = await listAppsInCategory(category);

  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
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
            {category}
          </h1>
          <p className="mt-4 text-[17px] text-muted-foreground">
            {apps.length} {apps.length === 1 ? "project" : "projects"} in this category
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/app/showcase/submit" className={BTN_PRIMARY}>
              List your app here
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <ShareRow title={`${category} apps — ${apps.length} projects on Embarko Showcase`} />
          </div>
        </div>
      </header>

      <section className="pb-[88px] max-[720px]:pb-[60px]">
        <div className={WRAP}>
          {apps.length > 0 ? (
            <div className="grid grid-cols-3 gap-6 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
              {apps.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          ) : (
            <div className="rounded-[14px] border border-dashed border-border px-8 py-16 text-center">
              <p className="text-[17px] font-medium">Nothing here yet.</p>
              <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
                No {category} apps have been listed so far. Yours could be the first.
              </p>
              <Link href="/app/showcase/submit" className={`${BTN_GHOST} mt-7`}>
                Be the first
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
