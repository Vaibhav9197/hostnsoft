import type { Metadata } from "next";

import { A, DocumentPage, P, Section } from "../components/DocumentPage";
import { SupportForm } from "../components/SupportForm";

// Real, navigable support URL — for OpenAI plugin submission's "Customer
// support URL" field, and anywhere else a link (not a button that opens a
// modal) is required. Same submission path as the footer's "Contact"
// button (ContactDialog -> POST /api/contact -> hostnsoft-api's
// POST /public/customer-query), just embedded directly on the page instead
// of behind a click.
export const metadata: Metadata = {
  title: "Support",
  keywords: ["Embarko support","Embarko help","contact Embarko"],
  description: "Get help with Embarko, or send feedback and feature requests.",
};

export default function SupportPage() {
  return (
    <DocumentPage title="Support">
      <Section>
        <P>
          Send us a message below and we&apos;ll reply by email. For a few specific cases, going
          straight to email is faster:
        </P>
        <ul className="mt-3 space-y-1.5 text-[15.5px] leading-[1.6] text-muted-foreground">
          <li>
            Reporting abuse of an app hosted on Embarko — see <A href="/abuse">Report Abuse</A> or
            email <A href="mailto:pushpendra@walkover.in">pushpendra@walkover.in</A>.
          </li>
          <li>
            Reporting a security vulnerability — see <A href="/security">Security</A> or email{" "}
            <A href="mailto:pushpendra@walkover.in">pushpendra@walkover.in</A>.
          </li>
          <li>
            Anything else — email <A href="mailto:pushpendra@walkover.in">pushpendra@walkover.in</A> directly.
          </li>
        </ul>
      </Section>

      <Section title="Send us a message">
        <SupportForm />
      </Section>
    </DocumentPage>
  );
}
