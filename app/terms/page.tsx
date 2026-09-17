import type { Metadata } from "next";

import { A, Code, DocumentPage, Fill, Item, List, P, Section, Term } from "../components/DocumentPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  keywords: ["Embarko terms of service","hosting terms"],
  description: "The terms that govern your use of Embarko.",
};

export default function TermsPage() {
  return (
    <DocumentPage title="Terms of Service" updated="September 2026">
      <Section title="1. Acceptance">
        <P>
          These terms govern your use of Embarko. By creating an account, deploying an app, or using
          a deploy token, you agree to them. If you do not agree, do not use the service. If you are
          agreeing on behalf of a company, you confirm you are authorised to bind it.
        </P>
      </Section>

      <Section title="2. What Embarko does">
        <P>
          Embarko takes an app your AI agent has built and runs it on the internet. You (or your
          agent) send the app&apos;s source to <Code>ship.embarko.ai</Code>; we build it, run it, and
          serve it over HTTPS at <Code>&lt;app-name&gt;.app.embarko.ai</Code> or a custom domain you
          connect. Depending on your plan, a live app can also use the database, file storage, login,
          and backup features described on our <A href="/pricing">pricing page</A> and in the{" "}
          <A href="/docs">documentation</A>.
        </P>
        <P>
          Unlike a static host, we execute the code you send us. That means your app&apos;s behaviour
          is your responsibility: what it does, what data it collects, who it serves, and what
          third-party services it calls from inside our infrastructure.
        </P>
      </Section>

      <Section title="3. Accounts, companies, and deploy tokens">
        <P>
          An Embarko account belongs to a person; apps belong to a company. A deploy token
          authenticates as a company rather than as a user, so anything deployed with it belongs to
          that company and is manageable by its members — not only by whoever ran the deploy.
        </P>
        <List>
          <Item>
            <Term>Projects create themselves.</Term> The first deploy of a new app name creates its
            project under your token&apos;s company. No dashboard step is required first.
          </Item>
          <Item>
            <Term>App names are unique platform-wide,</Term> because an app name is also its
            subdomain. A name already held by another company cannot be reused.
          </Item>
          <Item>
            <Term>Tokens are secrets, and yours to guard.</Term> Anyone holding a token can deploy as
            your company. Revoke a leaked token from <A href="/docs">your token settings</A>; we are
            not responsible for deploys made with a token you failed to protect.
          </Item>
        </List>
      </Section>

      <Section title="4. Plans, limits, and payment">
        <P>
          Each plan sets how many apps you may run at once and how much usage is included. Current
          plans and prices are published on the <A href="/pricing">pricing page</A>. Paid plans are
          billed in advance for the period shown at checkout, are charged to the card you have on
          file, and renew automatically until you cancel. Card details are handled by our payment
          processor; we never store your card number.
        </P>
        <P>
          We may adjust rate limits, build limits, storage limits, and resource ceilings to keep the
          platform stable and to prevent abuse. Where a change materially reduces what your current
          plan includes, we will give notice before it takes effect. Prices may change with{" "}
          <Fill>notice period</Fill> notice, applied from your next billing period.
        </P>
      </Section>

      <Section title="5. Your app and your content">
        <P>
          You own your app, your source code, and the data your app stores. We claim no rights to any
          of it. We store, build, run, and serve it solely to provide the service to you, and — where
          your plan includes backups — to keep the copies needed to restore it.
        </P>
        <P>
          Apps deployed to a company belong to that company. Its members can update, redeploy, or
          delete them, and the apps stay with the company if the person who deployed them leaves.
        </P>
      </Section>

      <Section title="6. Acceptable use">
        <P>You may not deploy or use an app on Embarko to:</P>
        <List>
          <Item>Do anything illegal under the law that applies to you or to us.</Item>
          <Item>Distribute malware, run phishing pages, or otherwise deceive the people who visit it.</Item>
          <Item>Send unsolicited bulk email, or host pages generated in bulk to manipulate search engines.</Item>
          <Item>Host content that exploits or endangers minors.</Item>
          <Item>Infringe anyone else&apos;s intellectual property or privacy rights.</Item>
          <Item>
            Consume resources in ways the platform is not for — cryptocurrency mining, proxying or
            relaying traffic for third parties, load generation against other systems, or attempts to
            escape your app&apos;s isolation or reach other customers&apos; data.
          </Item>
        </List>
        <P>
          We may remove an app, suspend a token, or suspend an account that breaks these rules, and
          for a live phishing or malware page we will usually do so before contacting you. Anyone can{" "}
          <A href="/abuse">report abuse</A>.
        </P>
      </Section>

      <Section title="7. Availability">
        <P>
          We work to keep Embarko and the apps on it available, and we publish incidents on our{" "}
          <A href="/status">status page</A>. We do not offer a contractual uptime guarantee on the
          plans listed publicly; <Fill>if an SLA applies to a plan, state it here</Fill>. Deploys,
          builds, and restarts can interrupt an app briefly, and we may take an app offline
          temporarily where it threatens the stability or security of the platform.
        </P>
      </Section>

      <Section title="8. Suspension, termination, and deletion">
        <P>
          You can delete an app at any time from the console or the API, and you can close your
          account whenever you like. Deleting an app removes its running instance, its stored data,
          and its backups; deleting a company removes all of its apps the same way. Deletion is
          permanent and we cannot recover it for you afterwards.
        </P>
        <P>
          We may suspend or terminate access for a breach of these terms, for non-payment after
          notice, or where we must to protect the platform or other customers. If we terminate your
          account we will delete your apps and their data after <Fill>grace period</Fill>.
        </P>
      </Section>

      <Section title="9. Warranties and liability">
        <P>
          Embarko is provided as-is, without warranties of any kind, express or implied. We are not
          liable for lost profits, lost data, or indirect or consequential damages arising from your
          use of the service, and our total liability is limited to{" "}
          <Fill>liability cap — e.g. fees paid in the previous 12 months</Fill>.
        </P>
        <P>
          Keep your own copy of anything you cannot afford to lose. Backups are a convenience — on
          the plans that include them — and not a substitute for your own source control.
        </P>
      </Section>

      <Section title="10. Changes to these terms">
        <P>
          We may update these terms. When we do, we update the date at the top of this page, and for
          material changes we will notify account holders by email. Continuing to use Embarko after a
          change takes effect means you accept the updated terms.
        </P>
      </Section>

      <Section title="11. Governing law">
        <P>
          These terms, and any dispute arising out of them or out of your use of Embarko, are governed
          by the laws of <Fill>governing jurisdiction</Fill>, without regard to conflict-of-law rules,
          and the courts of <Fill>venue</Fill> have exclusive jurisdiction. Nothing here limits rights
          you have under consumer protection law that cannot be waived by agreement. Embarko is
          operated by <Fill>legal entity name and registered address</Fill>.
        </P>
      </Section>

      <Section title="12. Contact">
        <P>
          Questions about these terms? Email <A href="mailto:hello@embarko.ai">hello@embarko.ai</A>.
        </P>
      </Section>
    </DocumentPage>
  );
}
