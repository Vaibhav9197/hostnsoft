"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { useBilling } from "@/app/lib/billing";
import { usePermissions } from "@/app/lib/permissions";
import { cn } from "@/app/lib/utils";

/**
 * Right end of the breadcrumb row: the plan the active company is on.
 *
 * Free shows an outlined "Upgrade" pill with a sparkle; a paid plan shows a
 * calm outlined chip with the plan's name. Outlined, not filled, so it never
 * pulls the eye away from the apps. Both link to Billing. Hidden while billing is loading or unreachable — a missing
 * chip is better than a wrong one.
 */
export function HeaderPlanBadge() {
  const { setup, planName, isFree, error } = useBilling();
  const pathname = usePathname();
  const onBilling = pathname === "/app/billing";
  const { settled, can } = usePermissions();

  // Both shapes lead to Billing and invite a plan change, which only Owners,
  // Admins and Billing members can make; for anyone else it's a dead end.
  // Held back until permissions are in, so it never shows and then vanishes.
  if (!settled || !can("billing.manage")) return null;
  if (error || setup === "unknown") return null;

  if (isFree) {
    return (
      <Link
        href="/app/billing"
        aria-label="Upgrade plan"
        className="group inline-flex h-8 items-center gap-1.5 rounded-full border border-control bg-transparent px-3.5 text-[0.8rem] font-medium text-foreground transition-colors hover:border-foreground/45 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Sparkles
          className="size-3.5 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
          aria-hidden="true"
        />
        Upgrade
      </Link>
    );
  }

  const label = planName ?? "Your plan";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/app/billing"
            aria-label={`${label} plan. Open billing`}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-full border border-control bg-card px-3.5 text-[0.8rem] font-medium text-foreground shadow-[0_1px_2px_rgba(20,18,16,0.06)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              onBilling && "bg-accent",
            )}
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>Change plan</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
