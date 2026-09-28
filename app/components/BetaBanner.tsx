"use client";

import { usePathname } from "next/navigation";

/** The signed-in panel and admin. The notice is for visitors; people inside
    the product don't need it on every screen. */
const HIDDEN_UNDER = ["/app", "/admin"];

/* A thin, fixed notice at the very top of every page. Rendered once by the
   root layout (app/layout.tsx), so marketing, docs, legal, landing variants,
   and legal pages all get it without each page opting in — everywhere except
   the signed-in panel and admin (HIDDEN_UNDER). Its height
   lives in one place — --beta-bar-h in app/base.css — which offsets the body
   and every sticky/fixed header so nothing sits underneath it. Colours use
   the shared tokens, which the console flips for its dark theme. Sits above
   headers (z-50) but below dialogs and overlays (z-100). */
export function BetaBanner() {
  const pathname = usePathname() ?? "";
  if (HIDDEN_UNDER.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  return (
    <div
      role="note"
      data-beta-bar=""
      className="fixed inset-x-0 top-0 z-[90] flex h-[var(--beta-bar-h)] items-center justify-center bg-neutral-950 px-4 text-[12.5px] text-white/70"
    >
      <p className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
        <span className="font-medium text-white">Embarko is in</span>
        <span className="rounded-full border border-white/20 bg-white/10 px-2 py-px text-[11px] font-semibold uppercase leading-4 tracking-wide text-white">
          Beta
        </span>
        <span className="hidden truncate sm:inline">— growing with every deploy</span>
      </p>
    </div>
  );
}
