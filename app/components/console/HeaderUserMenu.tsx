"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, CreditCard, KeyRound, LaptopMinimal, LayoutGrid, LogOut, Moon, Shield, Sparkles, Sun, User, Users } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { useSession } from "@/app/lib/session";
import { type ThemePref, useTheme } from "@/app/lib/theme";
import { cn } from "@/app/lib/utils";

/**
 * Account menu in the console header: who you're signed in as, which company
 * you're working in (and a switcher), and the way out.
 *
 * These used to live only in the left sidebar. Putting them in the header means
 * the console still works when the sidebar goes away — nothing here depends on
 * the sidebar being mounted or expanded.
 */
const THEMES: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: LaptopMinimal },
];

export function HeaderUserMenu() {
  const { user, companies, activeCompanyId, activeCompany, isSuperAdmin, setActiveCompanyId, signOut } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { pref, setPref } = useTheme();

  // Every console page is scoped to the active company, so whatever's on
  // screen (a project, its settings, deployments…) belongs to the company we're
  // leaving. Land on the projects list of the new company instead of letting
  // the old URL 404 against it.
  function switchCompany(companyId: string) {
    setActiveCompanyId(companyId);
    router.push("/app");
  }

  const workspace = [
    { href: "/app", label: "Apps", icon: LayoutGrid, exact: true },
    { href: "/app/members", label: "Members", icon: Users },
    { href: "/app/tokens", label: "Deploy tokens", icon: KeyRound },
    { href: "/app/showcase", label: "Showcase", icon: Sparkles },
    { href: "/app/billing", label: "Billing", icon: CreditCard },
    // Platform-wide, not company-scoped, so it sits last and only for admins.
    // Everyone else never sees it; the pages guard themselves regardless.
    ...(isSuperAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];
  const isCurrent = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

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
          <span className="truncate text-[0.8rem] font-medium text-foreground">
            {activeCompany ? activeCompany.companyName : email || "—"}
          </span>
          {activeCompany && email && (
            <span className="truncate text-[0.7rem] text-muted-foreground">{email}</span>
          )}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            {name && <span className="truncate text-sm font-semibold text-foreground">{name}</span>}
            <span className="truncate text-xs text-muted-foreground">{email}</span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {workspace.map(({ href, label, icon: Icon, exact }) => {
            const current = isCurrent(href, exact);
            return (
              <DropdownMenuItem key={href} asChild className="gap-2.5">
                <Link href={href} aria-current={current ? "page" : undefined}>
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className={current ? "font-medium text-foreground" : undefined}>{label}</span>
                  {current && <Check className="ml-auto size-4 shrink-0" aria-hidden="true" />}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Company</DropdownMenuLabel>
        <DropdownMenuGroup>
          {companies.map((company) => {
            const isActive = company.companyId === activeCompanyId;
            return (
              <DropdownMenuItem
                key={company.companyId}
                onClick={() => !isActive && switchCompany(company.companyId)}
                className="gap-2.5"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded bg-foreground text-[0.65rem] font-bold text-background">
                  {company.companyName.charAt(0).toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-[0.8rem]">{company.companyName}</span>
                </span>
                {isActive && <Check className="ml-auto size-4 shrink-0" aria-label="Current company" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>

        <DropdownMenuItem asChild className="gap-2.5">
          <Link href="/app/switch-company">
            <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            Manage companies
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* A segmented row rather than three menu items: the choice is one
            setting with three values, and showing all three makes it obvious
            that "System" is a distinct option from whichever theme the OS
            happens to be serving right now. */}
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Theme</DropdownMenuLabel>
        <div className="flex gap-1 px-1 pb-1" role="radiogroup" aria-label="Theme">
          {THEMES.map(({ value, label, icon: Icon }) => {
            const isActive = pref === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setPref(value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded px-2 py-1.5 text-[0.7rem] transition-colors",
                  isActive
                    ? "bg-elevated font-medium text-foreground"
                    : "text-muted-foreground hover:bg-elevated/60",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="gap-2.5">
          <Link href="/app/settings">
            <User className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => signOut()} className="gap-2.5">
          <LogOut className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
