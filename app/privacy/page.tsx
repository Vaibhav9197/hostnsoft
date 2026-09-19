import type { Metadata } from "next";

import { A, DocumentPage, Fill, Item, List, P, Section, Term } from "../components/DocumentPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  keywords: ["Embarko privacy policy","hosting privacy"],
  description: "What Embarko collects, why, and how long we keep it.",
};

export default function PrivacyPage() {
  return (
    <DocumentPage title="Privacy Policy" updated="September 2026">
      <Section>
        <P>
          This policy covers the data Embarko holds about <em>you</em>, our customer. Data that your
          own app collects from its visitors is yours, not ours — see{" "}
          <A href="#your-app">Your app&apos;s own data</A> below and, if you are subject to the GDPR,
          our <A href="/dpa">Data Processing Agreement</A>.
        </P>
      </Section>

      <Section title="What we collect">
        <List>
          <Item>
            <Term>Account identity.</Term> Your email address or phone number, verified through our
            authentication provider, plus the company you belong to and your role in it. Sign-in is
            by one-time code, so we never hold a password for you.
          </Item>
          <Item>
            <Term>Your app&apos;s source and configuration.</Term> The archive you deploy, the app
            name, the version string, and the environment variables and secrets you set.
          </Item>
          <Item>
            <Term>Deploy and build records.</Term> Timestamps, which token was used, build logs, and
            whether the deploy succeeded — kept so you can debug a failure and so we can investigate
            abuse.
          </Item>
          <Item>
            <Term>Runtime logs and metrics.</Term> Your app&apos;s own output plus resource usage
            (CPU, memory, storage, bandwidth), used to run the app, enforce plan limits, and bill
            usage.
          </Item>
          <Item>
            <Term>Request metadata for your live app.</Term> Path, referrer, coarse country, status
            code, and user agent class, used for the analytics we show you, for abuse prevention, and
            for reliability work.
          </Item>
          <Item>
            <Term>Billing details.</Term> Your plan, subscription state, and invoice history. Card
            details go directly to our payment processor and are stored there, not with us.
          </Item>
          <Item>
            <Term>Support correspondence.</Term> The emails you send us and our replies.
          </Item>
          <Item>
            <Term>Website analytics.</Term> Our marketing pages and console load Google Tag Manager,
            which sets analytics cookies and records page views and coarse device and location
            information. It is used to understand how people find and use Embarko.
          </Item>
        </List>
      </Section>

      <Section title="What we do not do">
        <List>
          <Item>We do not sell your personal data, and we do not share it for anyone else&apos;s marketing.</Item>
          <Item>We do not read the data your app stores in order to profile you or your visitors.</Item>
          <Item>We do not use your source code or your app&apos;s data to train AI models.</Item>
        </List>
      </Section>

      <Section title="How we use what we collect">
        <List>
          <Item>
            <Term>To run the service:</Term> building and serving your app, routing its domain,
            issuing certificates, restoring backups, and keeping the platform up.
          </Item>
          <Item>
            <Term>To bill you:</Term> measuring usage against your plan and processing payment.
          </Item>
          <Item>
            <Term>To contact you:</Term> sign-in codes, deploy and incident notices, billing
            messages, and occasional product announcements you can unsubscribe from. We do not sell
            your address on.
          </Item>
          <Item>
            <Term>To protect the platform:</Term> rate limiting, fraud and abuse investigation, and
            responding to reports about content hosted with us.
          </Item>
          <Item>
            <Term>To improve Embarko:</Term> aggregate usage patterns, error rates, and the analytics
            described above.
          </Item>
        </List>
      </Section>

      <Section title="Who we share it with">
        <P>
          We use service providers to operate Embarko — hosting and compute, storage, authentication,
          transactional email, billing and payments, and website analytics. Each processes data on our
          instructions under its own agreement with us. The current list, with purposes and locations,
          is in our <A href="/dpa">DPA</A>.
        </P>
        <P>
          We also disclose data where the law requires it, and where we need to in order to
          investigate a credible abuse or security report.
        </P>
      </Section>

      <Section title="How long we keep it">
        <List>
          <Item>Account and company records: for as long as your account exists.</Item>
          <Item>Apps, their data, and their backups: until you delete the app or close the account.</Item>
          <Item>
            Build and deploy logs, runtime logs, and raw request records: <Fill>retention window</Fill>,
            after which analytics survive only as aggregated counts.
          </Item>
          <Item>
            Invoices and billing records: for as long as tax and accounting law requires us to keep
            them, currently <Fill>retention period</Fill>.
          </Item>
          <Item>
            After you close your account, we delete your apps and their data within{" "}
            <Fill>deletion window</Fill>. Backups age out on their own schedule within{" "}
            <Fill>backup window</Fill>.
          </Item>
        </List>
      </Section>

      <Section title="Where your data is held">
        <P>
          Customer apps and the storage they write run in the European Union, on infrastructure
          certified to ISO/IEC 27001 by the provider that operates that region. This website and the
          console run separately, in <Fill>region(s) for embarko.ai and the console</Fill>. Where
          personal data
          moves outside the region it was collected in, we rely on{" "}
          <Fill>transfer mechanism — e.g. Standard Contractual Clauses</Fill>.
        </P>
      </Section>

      <Section title="Your app's own data" id="your-app">
        <P>
          Whatever your app collects from its visitors — accounts, uploads, database rows — belongs to
          you. We hold it because we run the app, and we access it only to operate the service: to
          keep the app running, to restore a backup, to answer a support request you have made, or
          where we are legally required to.
        </P>
        <P>
          If your app collects personal data, you are the controller of it and you need your own
          privacy notice for your visitors. This policy is not it.
        </P>
      </Section>

      <Section title="Your rights">
        <P>
          Depending on where you live, you may have the right to access the personal data we hold
          about you, correct it, export it, delete it, or object to some uses of it. Email{" "}
          <A href="mailto:hello@embarko.ai">hello@embarko.ai</A> and we will respond within{" "}
          <Fill>response window</Fill>. You can also complain to your local data protection
          authority; ours is <Fill>lead supervisory authority</Fill>.
        </P>
      </Section>

      <Section title="Changes">
        <P>
          We may update this policy. The date at the top of the page changes when we do, and we will
          email account holders about material changes.
        </P>
      </Section>

      <Section title="Contact">
        <P>
          Privacy questions go to <A href="mailto:hello@embarko.ai">hello@embarko.ai</A>. Embarko is
          operated by <Fill>legal entity name and registered address</Fill>.
        </P>
      </Section>
    </DocumentPage>
  );
}
