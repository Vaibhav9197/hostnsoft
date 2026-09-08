"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound } from "lucide-react";

import { Button } from "@/app/components/ui/button";

/**
 * Header shortcut to the Deploy tokens page. Deploying is the first thing a new
 * company needs a token for, so it gets a button of its own next to the plan
 * chip rather than living only inside the account menu. Hidden on the tokens
 * page itself — a button that goes where you already are is only noise.
 */
export function HeaderTokenButton() {
  const pathname = usePathname();

  if (pathname === "/app/tokens") return null;

  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/app/tokens" aria-label="Get a deploy token">
        <KeyRound aria-hidden="true" />
        {/* Narrow screens share the row with the plan chip, so drop the verb. */}
        <span className="sm:hidden">Token</span>
        <span className="hidden sm:inline">Get deploy token</span>
      </Link>
    </Button>
  );
}
