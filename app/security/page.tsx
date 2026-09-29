import type { Metadata } from "next";

import { A, Code, DocumentPage, Fill, Item, List, P, Section, Term } from "../components/DocumentPage";

export const metadata: Metadata = {
  title: "Security",
  keywords: ["Embarko security","secure app hosting","hosting data protection","isolated app hosting"],
  description: "How Embarko protects the apps and data it runs.",
};

export default function SecurityPage() {
  return (
    <DocumentPage title="Security" updated="September 2026">
      <Section>
        <P>
          Embarko runs other people&apos;s code. That shapes everything on this page: the platform has
          to keep your app&apos;s data safe from everyone else, keep every other app&apos;s code away
          from yours, and keep the deploy path from becoming a way in. For the legal commitments
          behind these controls, see our <A href="/terms">Terms</A>,{" "}
          <A href="/privacy">Privacy Policy</A>, and <A href="/dpa">DPA</A>.
        </P>
      </Section>

      <Section title="Where your app runs">
        <P>
          Embarko runs your app, and the storage it writes under <Code>DATA_DIR</Code>, on managed
          infrastructure certified to ISO/IEC 27001 — the international standard for
          information-security management, audited by an external body rather than self-declared.
        </P>
        <P>
          To be exact about whose certificate that is: it is held by the infrastructure provider
          Embarko runs on, and covers their facilities and information-security management. It is
          not a certification of Embarko itself, and we do not claim one. It also does not cover{" "}
          <Code>embarko.ai</Code> and the console, which run on separate infrastructure. A
          certification is not a statement about where data is located — see the{" "}
          <A href="/dpa">DPA</A> for where each category of data is processed.
        </P>
      </Section>

      <Section title="Isolation between apps">
        <List>
          <Item>Every app runs in its own isolated environment, with its own filesystem and its own persistent volume.</Item>
          <Item>
            An app can reach its own storage under <Code>DATA_DIR</Code> and nothing else. It has no
            path to another customer&apos;s app, data, or secrets.
          </Item>
          <Item>Resource ceilings per app keep one workload from starving the others, and a crashing app restarts without touching its neighbours.</Item>
        </List>
      </Section>

      <Section title="Encryption and secrets">
        <List>
          <Item>
            All traffic is served over HTTPS, on <Code>*.embarko.app</Code> and on connected custom
            domains, with certificates issued and renewed for you.
          </Item>
          <Item>Data is encrypted in transit, and encrypted at rest by our storage provider.</Item>
          <Item>Environment variables and app secrets are encrypted at rest under a separate key, and are exposed only to your own app&apos;s runtime.</Item>
          <Item>Access to production infrastructure is limited to the people who need it, and is logged.</Item>
        </List>
      </Section>

      <Section title="Deploy tokens and accounts">
        <List>
          <Item>
            <Term>Tokens are workspace-scoped.</Term> A deploy token authenticates as a workspace, so a
            deploy lands under that workspace&apos;s apps no matter who or what ran it.
          </Item>
          <Item>
            <Term>Tokens are stored hashed and are individually revocable,</Term> so a leaked one can
            be rotated without disturbing the rest. Revoke it and every subsequent deploy with it
            fails with <Code>unauthorized</Code>.
          </Item>
          <Item>
            <Term>There is no password to breach.</Term> Sign-in is a one-time code sent to your email
            or phone and verified by our authentication provider.
          </Item>
          <Item>App names are unique platform-wide, so nobody else can publish onto a subdomain you already hold.</Item>
        </List>
      </Section>

      <Section title="The deploy path">
        <List>
          <Item>
            Deploys go to <Code>ship.embarko.ai</Code> over HTTPS and require a valid token before any
            build begins.
          </Item>
          <Item>
            Uploaded source is checked before we build it. Patterns we know cannot work — an app
            calling <Code>window.storage</Code>, for instance — are rejected up front with{" "}
            <Code>422</Code> rather than half-built.
          </Item>
          <Item>Builds run in a throwaway environment, separate from the environment your app eventually runs in.</Item>
          <Item>Every deploy is recorded — which token, which version, what the build did — so an unexpected deploy is traceable.</Item>
        </List>
      </Section>

      <Section title="Your app's own security">
        <P>
          We secure the platform; your app&apos;s own behaviour is still yours. Embarko can give you
          HTTPS, isolation, backups, and a login building block, but it cannot make your app check
          authorisation correctly or stop it from leaking its own data. Treat the app your agent
          generated as code you are responsible for, and keep anything you cannot afford to lose in
          source control.
        </P>
      </Section>

      <Section title="Backups and deletion">
        <List>
          <Item>Automatic backups are included from the Creator plan up; see <A href="/pricing">pricing</A> for what each plan covers.</Item>
          <Item>Backup frequency and how far back you can restore: <Fill>schedule and retention</Fill>.</Item>
          <Item>Deleting an app permanently removes its instance, its stored data, and its backups. So does deleting the workspace that owns it.</Item>
          <Item>Closing an account deletes its apps and their data within <Fill>deletion window</Fill>.</Item>
        </List>
      </Section>

      <Section title="Cookies and analytics">
        <List>
          <Item>Our cookies exist for sign-in sessions and for the analytics described below. We do not run advertising cookies.</Item>
          <Item>Our marketing pages and console load Google Tag Manager for product analytics — page views and coarse device and location data.</Item>
          <Item>The analytics we show you about your live app use coarse request metadata; we do not hand raw visitor IP addresses to app owners.</Item>
        </List>
      </Section>

      <Section title="Infrastructure and sub-processors">
        <P>
          Embarko is built on third-party infrastructure for compute, storage, authentication, email,
          and payments. The current list, with purposes, locations, and our change-notification
          commitment, is maintained in the <A href="/dpa">DPA</A>.
        </P>
      </Section>

      <Section title="Reporting a vulnerability">
        <P>
          Email <A href="mailto:pushpendra@walkover.in">pushpendra@walkover.in</A> with what you found and
          how to reproduce it. We will acknowledge your report within{" "}
          <Fill>acknowledgement window</Fill> and keep you posted while we investigate. While you are
          testing, please stay within your own apps and account — do not access anyone else&apos;s
          data, and do not degrade the service for others.{" "}
          <Fill>state whether a bug bounty is offered</Fill>.
        </P>
      </Section>

      <Section title="Security reviews">
        <P>
          Running a vendor assessment? Email{" "}
          <A href="mailto:pushpendra@walkover.in">pushpendra@walkover.in</A> and we will work through your
          questionnaire.
        </P>
        <P>
          Embarko does not currently hold a certification of its own. The infrastructure its EU
          region runs on is certified to ISO/IEC 27001 by its provider, as described under{" "}
          <A href="#">Where your app runs</A> above. Other audit reports and certifications:{" "}
          <Fill>e.g. SOC 2 status, or &quot;none yet&quot;</Fill>.
        </P>
      </Section>
    </DocumentPage>
  );
}
