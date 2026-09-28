import type { Metadata } from "next";

import { PrimaryCta } from "../../../components/ds";
import { showcaseGeneralPrompt } from "../../../lib/showcasePrompt";

import { categoryFromSlug, listAppsInCategory, nameFromSlug } from "../../../lib/showcase";
import { ListPage } from "../../ListPage";
import { ShowcaseBreadcrumbs } from "../../breadcrumbs";

/**
 * A category page: /showcase/category/ai-tool. Every public app in one
 * category, wherever it was listed from. A slug that isn't a known category
 * still resolves and shows an empty state instead of a 404.
 * `/category/...` is a real directory so it matches before the
 * `[...collection]` catch-all.
 */

/* Per request, not prerendered: a build-time page would freeze the list. */
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const known = categoryFromSlug(slug);
  const category = known ?? nameFromSlug(slug);
  const apps = known ? await listAppsInCategory(known) : [];

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
  const known = categoryFromSlug(slug);
  const category = known ?? nameFromSlug(slug);
  const apps = known ? await listAppsInCategory(known) : [];
  const count = `${apps.length} ${apps.length === 1 ? "app" : "apps"}`;

  return (
    <>
      <ShowcaseBreadcrumbs trail={[{ name: category, path: `/showcase/category/${slug}` }]} />
      <ListPage
        title={category}
        lede={`${count} in this category`}
        apps={apps}
        shareTitle={`${category} apps — ${count} on Embarko Showcase`}
        actions={
          <>
            <PrimaryCta size="md" glow={false} label="Copy prompt to add your app" text={showcaseGeneralPrompt()} />
          </>
        }
        empty={{
          title: "No apps yet.",
          body: `No ${category} apps have been listed so far. Yours could be the first.`,
          action: (
            <PrimaryCta size="md" glow={false} label="Copy prompt to add your app" text={showcaseGeneralPrompt()} />
          ),
        }}
      />
    </>
  );
}
