import type { Metadata } from "next";

import { A, DocumentPage, Item, List, P, Section, Term } from "../components/DocumentPage";

export const metadata: Metadata = {
  title: "Data Processing Agreement",
  keywords: ["Embarko DPA","data processing agreement hosting","GDPR hosting"],
  description: "How Embarko processes personal data on your behalf.",
};

/** Only the providers the platform actually depends on today, and only
 *  locations we have confirmed — an invented sub-processor row or location is
 *  a compliance problem, not a typo. Unconfirmed locations render as a dash.
 *  GDPR Art. 28(2) still needs the compute provider named and Chapter V needs
 *  its location plus a transfer mechanism; both await written confirmation
 *  (see app/lib/trust.ts). */
const SUB_PROCESSORS: { name: string; purpose: string; location?: string }[] = [
  { name: "MSG91", purpose: "Sign-in codes and transactional email", location: "India" },
  { name: "Stripe", purpose: "Card payments and stored payment methods", location: "United States" },
  { name: "Lago", purpose: "Subscription and usage metering" },
  { name: "Google (Tag Manager)", purpose: "Website and console analytics", location: "United States" },
  { name: "Cloud infrastructure provider", purpose: "Building, running, and storing customer apps" },
];

export default function DpaPage() {
  return (
    <DocumentPage title="Data Processing Agreement" updated="October 2026">
      <Section title="1. Scope and roles">
        <P>
          This Data Processing Agreement applies when you use Embarko to run an app that handles
          personal data and you are subject to data protection law such as the UK GDPR or EU GDPR. In
          that arrangement you are the data controller and Embarko is your processor. It takes effect
          when you deploy such an app; no separate signature is needed.
        </P>
        <P>
          Where the account belongs to a company, the company is the controller and its members act
          on its behalf. This DPA sits alongside our <A href="/terms">Terms of Service</A> and{" "}
          <A href="/privacy">Privacy Policy</A>; if they conflict on the processing of personal data,
          this document wins. Embarko is operated by{" "}
          SuperHeroes Inc., 5th Floor, Wing B, LIC Tower, 28-29-30, PU-03, Scheme No. 54, Indore, Madhya Pradesh 452011, India.
        </P>
      </Section>

      <Section title="2. What we process, and why">
        <P>
          Embarko runs the app you deploy. Any personal data inside it is processed only to provide
          that service:
        </P>
        <List>
          <Item>
            <Term>App source and configuration</Term> — the archive you deploy, plus environment
            variables and secrets, stored so the app can be built and run.
          </Item>
          <Item>
            <Term>App runtime data</Term> — whatever your app writes to its database or file storage
            while running. We store it, serve it back to your app, and include it in backups on the
            plans that have them.
          </Item>
          <Item>
            <Term>Request metadata</Term> — paths, referrers, coarse geography, status codes, and user
            agent classes for requests to your live app, processed for your analytics and for abuse
            prevention and reliability. Raw request records are deleted after 100 days.
          </Item>
          <Item>
            <Term>Logs</Term> — build output and your app&apos;s own runtime output, kept for
            debugging.
          </Item>
          <Item>
            <Term>Account and membership data</Term> — the email addresses, roles, and join records of
            the people in your workspace, processed to operate access control.
          </Item>
        </List>
        <P>
          We do not read, index, or analyse the contents of your app&apos;s data beyond what running,
          backing up, and serving it requires, and we do not use it to train AI models.
        </P>
      </Section>

      <Section title="3. Duration and deletion">
        <List>
          <Item>We process personal data for as long as your app exists on Embarko.</Item>
          <Item>
            Deleting an app permanently removes its running instance, its stored data, and its
            backups. Deleting a workspace does the same for all of its apps.
          </Item>
          <Item>Closing an account deletes its apps and their data.</Item>
          <Item>We delete or return personal data on your written instruction, subject to any legal retention duty.</Item>
        </List>
      </Section>

      <Section title="4. Your responsibilities as controller">
        <List>
          <Item>Having a lawful basis for the personal data your app processes.</Item>
          <Item>Giving your own privacy notice to the people whose data your app holds.</Item>
          <Item>
            Assessing the risk before putting special category data — health, financial, biometric,
            data about children — into an app you run here.
          </Item>
          <Item>Configuring your app&apos;s own access controls correctly, and keeping your deploy tokens and secrets safe.</Item>
          <Item>Deleting apps and data once you no longer need them.</Item>
        </List>
      </Section>

      <Section title="5. Our obligations as processor">
        <List>
          <Item>We process personal data only on your documented instructions — which, in practice, means running, serving, and backing up the app you deployed.</Item>
          <Item>We do not sell it and we do not use it for our own purposes.</Item>
          <Item>Our staff and contractors are bound by confidentiality obligations.</Item>
          <Item>We maintain the technical and organisational measures in section 6.</Item>
          <Item>
            We notify you without undue delay, and in any event within 72 hours, once we become aware
            of a personal data breach affecting your data, with what we know at the time.
          </Item>
          <Item>
            We help you respond to data subject requests and to regulators where the information is
            within our control, and we make the information in this DPA available for your audits and
            assessments.
          </Item>
        </List>
      </Section>

      <Section title="6. Security measures">
        <List>
          <Item>All traffic is served over HTTPS, on both <code className="font-mono text-[0.9em]">*.embarko.app</code> and connected custom domains.</Item>
          <Item>Data is encrypted in transit, and encrypted at rest by our storage provider.</Item>
          <Item>Environment variables and app secrets are encrypted at rest under a separate key.</Item>
          <Item>Deploy tokens are stored hashed, are scoped to one workspace, and can be revoked individually.</Item>
          <Item>Each app runs isolated from every other app, with its own persistent storage.</Item>
          <Item>Access to production infrastructure is restricted to the people who need it and is logged.</Item>
        </List>
        <P>
          Our <A href="/security">security page</A> describes these controls in more detail.
        </P>
      </Section>

      <Section title="7. Sub-processors">
        <P>
          We use the providers below to deliver Embarko. Each is bound by data processing terms with
          us. We will give you notice before adding or replacing one, and
          you may object on reasonable data protection grounds.
        </P>
        <div className="overflow-x-auto rounded-[12px] border border-border">
          <table className="w-full min-w-[560px] border-collapse text-left text-[14.5px]">
            <thead>
              <tr className="border-b border-border bg-elevated">
                <th className="px-4 py-3 font-semibold">Sub-processor</th>
                <th className="px-4 py-3 font-semibold">Purpose</th>
                <th className="px-4 py-3 font-semibold">Location</th>
              </tr>
            </thead>
            <tbody>
              {SUB_PROCESSORS.map((row, i) => (
                <tr key={i} className={i !== SUB_PROCESSORS.length - 1 ? "border-b border-border" : ""}>
                  <td className="px-4 py-3 align-top font-medium text-foreground">{row.name}</td>
                  <td className="px-4 py-3 align-top text-muted-foreground">{row.purpose}</td>
                  <td className="px-4 py-3 align-top text-muted-foreground">{row.location ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="8. Changes and contact">
        <P>
          We update this DPA as the service changes, and the date at the top of the page changes with
          it. For questions, a signed copy, or a security review, email{" "}
          <A href="mailto:pushpendra@walkover.in">pushpendra@walkover.in</A>.
        </P>
      </Section>
    </DocumentPage>
  );
}
