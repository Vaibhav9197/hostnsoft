"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Check, ChevronsUpDown, KeyRound, LayoutGrid, LogOut, User, Users } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { ROLE_LABEL } from "@/app/lib/format";
import { atLeast, useSession } from "@/app/lib/session";

/**
 * Account menu in the console header: who you're signed in as, which company
 * you're working in (and a switcher), and the way out.
 *
 * These used to live only in the left sidebar. Putting them in the header means
 * the console still works when the sidebar goes away — nothing here depends on
 * the sidebar being mounted or expanded.
 */
export function HeaderUserMenu() {
  const { user, companies, activeCompanyId, activeCompany, role, setActiveCompanyId, signOut } = useSession();
  const pathname = usePathname();

  /* Deploy tokens stays admin-only here, exactly as it is in the sidebar. */
  const workspace = [
    { href: "/app", label: "Projects", icon: LayoutGrid, exact: true },
    { href: "/app/members", label: "Members", icon: Users },
    ...(atLeast(role, "company_admin")
      ? [{ href: "/app/tokens", label: "Deploy tokens", icon: KeyRound }]
      : []),
  ];
  const isCurrent = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const name = user?.name?.trim() || null;
  const email = user?.email ?? "";
  const initial = (name || email || "?").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex max-w-[16rem] items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                onClick={() => !isActive && setActiveCompanyId(company.companyId)}
                className="gap-2.5"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded bg-foreground text-[0.65rem] font-bold text-background">
                  {company.companyName.charAt(0).toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-[0.8rem]">{company.companyName}</span>
                  <span className="truncate text-[0.7rem] text-muted-foreground">{ROLE_LABEL[company.role]}</span>
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
