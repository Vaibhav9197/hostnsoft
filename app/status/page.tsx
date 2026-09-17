import type { Metadata } from "next";

import { A, DocumentPage, Fill, P, Section } from "../components/DocumentPage";

export const metadata: Metadata = {
  title: "Status",
  keywords: ["Embarko status","Embarko uptime","is Embarko down"],
  description: "Current operational status of the Embarko platform.",
};

/**
 * A static status page. Nothing here is wired to monitoring yet — the states
 * below are written by hand, so they must be edited when an incident starts
 * and again when it ends. Swapping this for a feed from a real status provider
 * is the obvious next step; the placeholder in the footer note says so on the
 * page itself rather than only in this comment.
 */
const COMPONENTS = [
  { name: "Deploy API", detail: "ship.embarko.ai", state: "operational" },
  { name: "Builds", detail: "Turning uploaded source into a running app", state: "operational" },
  { name: "App serving", detail: "*.app.embarko.ai and custom domains", state: "operational" },
  { name: "App storage", detail: "Databases and uploaded files", state: "operational" },
  { name: "Console", detail: "embarko.ai and the dashboard", state: "operational" },
  { name: "Sign-in", detail: "One-time codes and sessions", state: "operational" },
  { name: "Billing", detail: "Plans, cards, and invoices", state: "operational" },
] as const;

export default function StatusPage() {
  const allWell = COMPONENTS.every((component) => component.state === "operational");

  return (
    <DocumentPage title="Status">
      <Section>
        <div className="flex items-center gap-3 rounded-[12px] border border-border bg-card px-5 py-4">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${allWell ? "bg-success" : "bg-warning"}`}
          />
          <span className="text-[17px] font-semibold">
            {allWell ? "All systems operational" : "Some systems are degraded"}
          </span>
        </div>
      </Section>

      <Section title="Components">
        <div className="overflow-hidden rounded-[12px] border border-border">
          {COMPONENTS.map((component, i) => (
            <div
              key={component.name}
              className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${
                i !== COMPONENTS.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div>
                <div className="text-[15px] font-medium">{component.name}</div>
                <div className="mt-0.5 text-[13px] text-muted-foreground">{component.detail}</div>
              </div>
              <span className="flex items-center gap-2 font-mono text-[12.5px] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Operational
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Incidents">
        <P>
          No incidents to report. Past incidents and maintenance windows are posted here, and account
          holders are emailed about anything that affects a running app.
        </P>
      </Section>
    </DocumentPage>
  );
}
