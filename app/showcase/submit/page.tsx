import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { WRAP } from "../kit";
import { SubmitForm } from "./SubmitForm";

export const metadata: Metadata = {
  title: "Submit to Showcase — Embarko",
  description: "Submit your live Embarko app to Showcase.",
  /* A form has nothing to rank for, and indexing it competes with the gallery
     for the same queries. */
  robots: { index: false, follow: true },
};

export default function SubmitPage() {
  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <SiteHeader />

      <div className="py-[72px] max-[900px]:py-12">
        <div className={WRAP}>
          <Link
            href="/showcase"
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Showcase
          </Link>

          <h1 className="mt-6 text-[42px] font-semibold leading-[1.1] tracking-[-0.02em] max-[900px]:text-[32px]">
            Show what you built.
          </h1>
          <p className="mt-4 text-[17px] text-muted-foreground">
            Submit your live Embarko app to Showcase.
          </p>

          <SubmitForm />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
