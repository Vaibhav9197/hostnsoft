"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";

import { Button } from "@/app/components/ui/button";

/**
 * Header shortcut back to the apps list. Hidden while that list is what's on
 * screen — a button that goes where you already are is only noise.
 */
export function HeaderHomeButton() {
  const pathname = usePathname();

  if (pathname === "/app") return null;

  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/app" aria-label="Go to your apps">
        <LayoutGrid aria-hidden="true" />
        <span>Home</span>
      </Link>
    </Button>
  );
}
