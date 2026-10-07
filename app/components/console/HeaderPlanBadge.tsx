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
import { cn } from "@/app/lib/utils";

/**
 * Right end of the breadcrumb row: the plan the active company is on.
 *
 * Free is the one state with somewhere to go, so it's a solid ink "Upgrade"
 * pill with a sparkle — the only filled shape in the row. A paid plan has
 * nothing to sell, so it's a calm outlined chip with the plan's name.
 *
 * Monochrome on purpose: the console is ink on warm paper, and the contrast of
 * the one solid shape does the attracting a brand colour would elsewhere. Both
 * link to Billing. Hidden while billing is loading or unreachable — a missing
 * chip is better than a wrong one.
 */
export function HeaderPlanBadge() {
  const { setup, planName, isFree, error } = useBilling();
  const pathname = usePathname();
  const onBilling = pathname === "/app/billing";

  if (error || setup === "unknown") return null;

  if (isFree) {
    return (
      <Link
        href="/app/billing"
        aria-label="Upgrade plan"
        className="group inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[0.8rem] font-medium text-background shadow-[0_1px_2px_rgba(20,18,16,0.12)] transition-[box-shadow,transform] duration-300 hover:-translate-y-px hover:shadow-[0_6px_16px_-6px_rgba(20,18,16,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              "inline-flex h-8 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-[0.8rem] font-medium text-foreground shadow-[0_1px_2px_rgba(20,18,16,0.06)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
