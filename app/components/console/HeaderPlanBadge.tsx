"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { useBilling } from "@/app/lib/billing";
import { cn } from "@/app/lib/utils";

/**
 * Right side of the console header: which plan the active company is on. The
 * chip itself links to the Billing page, so there is no separate "Upgrade"
 * button. Hidden entirely while billing is loading or unreachable — a missing
 * chip is better than a wrong one. The header owns the right-hand alignment,
 * so this renders just the chip.
 */
export function HeaderPlanBadge() {
  const { setup, planName, error } = useBilling();
  const pathname = usePathname();
  const onBilling = pathname === "/app/billing";

  if (error || setup === "unknown") return null;

  const label = planName ?? "—";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/app/billing"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground",
              onBilling && "text-foreground",
            )}
            aria-label={`Current plan: ${label}. Open billing`}
          >
            <CreditCard className="size-3.5" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>Change plan</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
