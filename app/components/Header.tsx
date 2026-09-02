"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface HeaderProps {
  /** Opens the shared login/signup modal. Each page owns its own modal instance
   *  and passes the trigger down, so there's never more than one mounted at once. */
  onAuthClick: () => void;
}

export function Header({ onAuthClick }: HeaderProps) {
  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-bold text-neutral-950">
          Embarko
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="hidden text-sm font-medium text-neutral-600 hover:text-neutral-950 sm:block">
            Pricing
          </Link>
          <Link href="/doc" className="hidden text-sm font-medium text-neutral-600 hover:text-neutral-950 sm:block">
            Docs
          </Link>
          <button
            type="button"
            onClick={onAuthClick}
            className="hidden text-sm font-medium text-neutral-600 hover:text-neutral-950 sm:block"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={onAuthClick}
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
          >
            Sign up <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
