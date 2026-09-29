"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Check, Copy, Plus } from "lucide-react";

import { COPIED_LABEL, CopyPromptButton } from "../../../../components/CopyPromptButton";
import { ConfirmDialog, type ConfirmRequest } from "../../../../components/console/ConfirmDialog";
import { Alert, EmptyState, LinkButton, Page, Panel, PanelTitle, Skeleton, Steps, Tag } from "../../../../components/console/kit";
import { Button, buttonVariants } from "../../../../components/ui/button";
import { showcaseApi } from "../../../../lib/hnsApi";
import { formatDate } from "../../../../lib/format";
import { useSession } from "../../../../lib/session";
import { showcaseListPrompt } from "../../../../lib/showcasePrompt";
import { useProject } from "../../../../lib/useProject";
import type { ShowcaseListing, ShowcasePage } from "../../../../lib/types";
import { SITE_HOST } from "../../../../lib/site";

/**
 * This one app on Showcase: is it there, where, and how to put it there.
 *
 * A section of its own rather than a panel inside Settings, because Showcase
 * is something people come to do on purpose — it was easy to miss among the
 * rename field and the delete box, and it is not a setting.
 */
export default function ProjectShowcasePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId } = useSession();
  const { project, error: projectError } = useProject(activeCompanyId, projectId);

  const [listings, setListings] = useState<ShowcaseListing[] | null>(null);
  const [companyPage, setCompanyPage] = useState<ShowcasePage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const companyListing = listings?.find((l) => l.collection.type === "company") ?? null;
  const eventListings = listings?.filter((l) => l.collection.type !== "company") ?? [];

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    try {
      const [mine, pages] = await Promise.all([
        showcaseApi.listMySubmissions(activeCompanyId, projectId),
        showcaseApi.listPages(activeCompanyId),
      ]);
      setListings(mine);
      setCompanyPage(pages.find((p) => p.type === "company") ?? null);
    } catch (e) {
      setListings([]);
      setError(e instanceof Error ? e.message : "Couldn’t load Showcase.");
    }
  }, [activeCompanyId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  function askRemove(l: ShowcaseListing) {
    setConfirm({
      title: `Remove ${l.name} from ${l.collection.type === "company" ? "Showcase" : l.collection.title}?`,
      body: "Its public page goes away straight away. You can list it again any time.",
      cta: "Remove",
      destructive: true,
      onConfirm: async () => {
        if (!activeCompanyId) return;
        try {
          await showcaseApi.withdraw(activeCompanyId, l.id);
          await load();
          toast.success("Removed from Showcase");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Couldn’t remove that.");
        }
      },
    });
  }

  if (projectError) return <Page><Alert>{projectError}</Alert></Page>;

  const listUrl = `/app/showcase/submit?app=${encodeURIComponent(projectId)}&from=app`;
  const loading = listings === null || !project;
  const listed = (listings?.length ?? 0) > 0;
  const visible = listings?.find((l) => !l.isPrivate) ?? null;

  return (
    <Page>
      {error && <Alert>{error}</Alert>}

      {loading && <Skeleton className="h-[160px]" aria-hidden="true" />}

      {/* ------------------------------------------------------- not listed */}
      {!loading && !listed && (
        <>
          <Panel padded className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 max-w-[60ch]">
              <PanelTitle>Let your AI list it</PanelTitle>
              <p className="mt-1 text-[0.9rem] text-muted-foreground">
                Paste this into the AI that built {project.name}. It writes the description, adds a
                screenshot and tags from the code, and puts the app on your workspace page.
              </p>
            </div>
            <CopyPromptButton
              text={showcaseListPrompt(companyPage ?? { slug: "", title: "", type: "company" }, project.slug)}
              className={buttonVariants()}
              disabled={!companyPage}
              copiedChildren={
                <>
                  <Check aria-hidden="true" />
                  {COPIED_LABEL}
                </>
              }
            >
              <Copy aria-hidden="true" />
              Copy Showcase prompt
            </CopyPromptButton>
          </Panel>

          <EmptyState title="Not on Showcase yet">
            <p>
              Showcase is Embarko’s public gallery of apps built with AI. Listing {project.name} gives it a
              page of its own at{" "}
              <a href="/showcase" target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-2">
                {SITE_HOST}/showcase
              </a>{" "}
              and puts it on your workspace page.
            </p>
            <Steps steps={["Say what it does", "Who built it", "It’s live"]} />
            <div className="mt-6">
              <Button asChild variant="outline">
                <Link href={listUrl}>
                  <Plus aria-hidden="true" />
                  Fill in the form instead
                </Link>
              </Button>
            </div>
          </EmptyState>
        </>
      )}

      {/* ----------------------------------------------------------- listed */}
      {!loading && listed && (
        <>
          <Panel padded className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <PanelTitle>
                  {companyListing
                    ? companyListing.isPrivate
                      ? "On Showcase, hidden on your workspace page"
                      : "On Showcase"
                    : `On ${eventListings[0].collection.title}`}
                </PanelTitle>
              </div>
              <p className="mt-1 text-[0.9rem] text-muted-foreground">
                {companyListing && companyPage
                  ? `Live in the gallery and at ${SITE_HOST}/showcase/${companyPage.slug}.`
                  : "Live in the Showcase gallery."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`${listUrl}${companyListing ? "&where=event" : ""}`}>
                  <Plus aria-hidden="true" />
                  {companyListing ? "Add to an event page" : "Add to your workspace page"}
                </Link>
              </Button>
              {visible && (
                <Button asChild size="sm">
                  <a href={`/showcase/app/${visible.slug}`} target="_blank" rel="noreferrer">
                    View its page
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                </Button>
              )}
            </div>
          </Panel>

          <Panel padded className="flex flex-col gap-3">
            <div>
              <PanelTitle>Pages it’s on</PanelTitle>
              {/* Each page holds its own copy of the details — the description,
                  screenshot and tags can differ per page — so the prompt that
                  updates them sits on the row for that page. */}
              <p className="mt-1 text-[0.9rem] text-muted-foreground">
                Each page has its own description, screenshot and tags. To change them, copy that page’s
                prompt into the AI that built the app.
              </p>
            </div>
            <ul className="divide-y divide-border">
              {listings!.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <a
                        href={`/showcase/${l.collection.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-foreground hover:underline"
                      >
                        {l.collection.type === "company" ? "Your workspace page" : l.collection.title}
                      </a>
                      {l.collection.type !== "company" && <Tag>Event page</Tag>}
                      {l.isPrivate && <Tag>Hidden by organiser</Tag>}
                    </div>
                    <p className="text-[0.8rem] text-muted-foreground">
                      {SITE_HOST}/showcase/{l.collection.slug} · added {formatDate(l.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <CopyPromptButton
                      text={showcaseListPrompt(l.collection, project.slug)}
                      className="inline-flex items-center gap-1 text-[0.84rem] font-semibold text-muted-foreground hover:text-foreground hover:underline"
                      copiedChildren={
                        <>
                          <Check aria-hidden="true" className="size-3" />
                          {COPIED_LABEL}
                        </>
                      }
                    >
                      <Copy aria-hidden="true" className="size-3" />
                      Update with AI
                    </CopyPromptButton>
                    {!l.isPrivate && (
                      <a
                        href={`/showcase/app/${l.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[0.84rem] font-semibold text-muted-foreground hover:text-foreground hover:underline"
                      >
                        View page
                        <ArrowUpRight aria-hidden="true" className="size-3" />
                      </a>
                    )}
                    <LinkButton danger onClick={() => askRemove(l)}>
                      Remove
                    </LinkButton>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

        </>
      )}

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </Page>
  );
}
