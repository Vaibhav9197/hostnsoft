import type { Metadata } from "next";

import { A, Code, DocumentPage, Item, List, P, Section } from "../components/DocumentPage";

export const metadata: Metadata = {
  title: "Report Abuse",
  keywords: ["report abuse Embarko","report hosted app"],
  description: "How to report a site or app hosted on Embarko.",
};

export default function AbusePage() {
  return (
    <DocumentPage title="Report Abuse">
      <Section>
        <P>
          Embarko runs apps that its customers deploy, on <Code>*.embarko.app</Code> subdomains and
          on custom domains they connect. If you have found something hosted with us that is abusive —
          phishing, malware, spam, content that exploits or endangers minors, impersonation,
          intellectual property infringement, or anything else our{" "}
          <A href="/terms">Terms of Service</A> prohibit — tell us and we will review it.
        </P>
      </Section>

      <Section title="How to report">
        <P>
          Email <A href="mailto:abuse@embarko.ai">abuse@embarko.ai</A> and include:
        </P>
        <List>
          <Item>The full URL of the app or page you are reporting.</Item>
          <Item>What is wrong with it, in a sentence — phishing, malware, impersonation, and so on.</Item>
          <Item>Anything that helps us confirm it: screenshots, the brand being impersonated, the message that linked you there.</Item>
          <Item>Whether the content is still live, if you have already seen it change.</Item>
        </List>
        <P>
          You do not need an Embarko account to report abuse, and you can ask us not to share your
          details with the account holder.
        </P>
      </Section>

      <Section title="What happens next">
        <List>
          <Item>A person reviews every report — this is not an automated takedown queue.</Item>
          <Item>Confirmed violations are removed, and the account behind them may be suspended.</Item>
          <Item>Live phishing and malware are acted on first, and usually taken down before we contact the account holder.</Item>
          <Item>We will reply to let you know the outcome where you have given us a way to reach you.</Item>
        </List>
      </Section>

      <Section title="Other kinds of report">
        <List>
          <Item>
            A security vulnerability in Embarko itself goes to{" "}
            <A href="mailto:security@embarko.ai">security@embarko.ai</A> — see our{" "}
            <A href="/security">security page</A>.
          </Item>
          <Item>
            A privacy or data protection question goes to{" "}
            <A href="mailto:hello@embarko.ai">hello@embarko.ai</A> — see our{" "}
            <A href="/privacy">privacy policy</A>.
          </Item>
          <Item>
            Anything else: <A href="mailto:hello@embarko.ai">hello@embarko.ai</A>.
          </Item>
        </List>
      </Section>
    </DocumentPage>
  );
}
