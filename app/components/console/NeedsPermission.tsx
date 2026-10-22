"use client";

import Link from "next/link";

import { EmptyState, Page, Skeleton } from "./kit";
import { buttonVariants } from "../ui/button";
import { ROLE_LABELS, usePermissions } from "../../lib/permissions";
import type { Permission } from "../../lib/types";

/**
 * A page only some roles can use. The menu already hides it from the rest;
 * this is for someone who arrives anyway (an old link, a bookmark). It waits
 * for the person's permissions before mounting the page, so the page's own
 * first request never goes out just to come back "you don't have
 * permission", and then shows one calm line instead of that error.
 */
export function NeedsPermission({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { settled, can } = usePermissions();
  if (!settled) {
    return (
      <Page>
        <Skeleton className="h-[120px]" aria-hidden="true" />
      </Page>
    );
  }
  if (!can(permission)) return <NoAccess />;
  return <>{children}</>;
}

/** "Not part of your role", with who to ask and a way back. */
export function NoAccess({ title = "This isn’t part of your role" }: { title?: string }) {
  const { role, can } = usePermissions();
  // Somewhere they can go: their apps, or the plan for a Billing member.
  const back = can("app.view")
    ? { href: "/app", label: "Go to your apps" }
    : can("billing.manage")
      ? { href: "/app/billing", label: "Go to billing" }
      : null;
  return (
    <Page>
      <EmptyState title={title}>
        <p className="mx-auto max-w-[44ch]">
          {role ? `You’re ${article(ROLE_LABELS[role])} ${ROLE_LABELS[role]} in this workspace. ` : ""}
          If you need this, ask a workspace Owner or Admin.
        </p>
        {back && (
          <div className="mt-5">
            <Link href={back.href} className={buttonVariants({ variant: "outline" })}>
              {back.label}
            </Link>
          </div>
        )}
      </EmptyState>
    </Page>
  );
}

function article(word: string) {
  return /^[AEIOU]/.test(word) ? "an" : "a";
}
