"use client";

import Link from "next/link";
import { Building2, ChevronDown, CreditCard, KeyRound, LayoutGrid, LogOut, Shield, Sparkles, Settings, Users } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { useSession } from "@/app/lib/session";
import { cn } from "@/app/lib/utils";

/**
 * Account menu in the console header: who you're signed in as, which company
 * you're working in (and a switcher), and the way out.
 *
 * These used to live only in the left sidebar. Putting them in the header means
 * the console still works when the sidebar goes away — nothing here depends on
 * the sidebar being mounted or expanded.
 */
// Tint the row under the pointer; the shared item only tints on focus, which
// barely shows on the dark header.
const HOVER = "gap-2.5 hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] focus:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]";

export function HeaderUserMenu() {
  const { user, activeCompany, isSuperAdmin, signOut } = useSession();

  // Switching workspace changes what every other page shows, so it sits on
  // its own at the top. Admin is platform-wide and only for admins; the pages
  // guard themselves regardless.
  const groups = [
    [{ href: "/app/switch-workspace", label: "Switch workspace", icon: Building2 }],
    [
      { href: "/app", label: "Your apps", icon: LayoutGrid },
      { href: "/app/tokens", label: "Deploy tokens", icon: KeyRound },
      { href: "/app/showcase", label: "Showcase", icon: Sparkles },
    ],
    [
      { href: "/app/members", label: "Members", icon: Users },
      { href: "/app/billing", label: "Billing", icon: CreditCard },
      { href: "/app/settings", label: "Settings", icon: Settings },
      ...(isSuperAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
    ],
  ];

  const name = user?.name?.trim() || null;
  const email = user?.email ?? "";
  const initial = (name || email || "?").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        // No focus ring: closing the menu returns focus here, which left the
        // ring drawn over the header after every click. Keyboard focus still
        // shows through the same tint as hover.
        className="flex max-w-[16rem] items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
        aria-label="Account menu"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-foreground text-xs font-bold text-background">
          {initial}
        </span>
        {/* The company is the context every page is scoped to and the thing
            people switch between, so it's the visible label; the signed-in
            email sits under it. Before a company is picked there's nothing to
            lead with, so the email moves up and stands alone. Hidden on narrow
            screens, where the avatar alone carries it. */}
        <span className="hidden min-w-0 flex-col leading-tight sm:flex">
          <span className="truncate text-sm font-medium text-foreground">
            {activeCompany ? activeCompany.companyName : email || "—"}
          </span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {groups.map((items, i) => (
          <div key={i}>
            <DropdownMenuGroup>
              {items.map(({ href, label, icon: Icon }) => (
                <DropdownMenuItem key={href} asChild className={HOVER}>
                  <Link href={href}>
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </div>
        ))}

        {/* Log out and the signed-in email are one row, so the whole block is
            the click target. */}
        <DropdownMenuItem onClick={() => signOut()} className={cn(HOVER, "items-start")}>
          <LogOut className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span>Log out</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
