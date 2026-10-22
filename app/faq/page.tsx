import type { Metadata } from "next";

import { A, DocumentPage, P, Section } from "../components/DocumentPage";

export const metadata: Metadata = {
  title: "FAQ",
  keywords: ["Embarko FAQ", "Embarko questions", "deploy AI built app", "Embarko hosting help"],
  description:
    "Answers to the most common questions about Embarko: deploying, custom domains, plans, what happens when something breaks, and where to ask next.",
};

const FAQ: Array<{ group: string; items: Array<[string, React.ReactNode]> }> = [
  {
    group: "Getting started",
    items: [
      [
        "What is Embarko?",
        "Embarko hosts apps that your AI agent builds. Your AI writes the app and deploys it; Embarko keeps it live at a public link and tells you whether it is healthy.",
      ],
      [
        "Do I need to know how to code?",
        "No. You tell your AI what to build and ask it to deploy to Embarko. The panel only shows your apps and their state.",
      ],
      [
        "How do I deploy my first app?",
        <>
          Open <A href="/app">Your apps</A>, click <strong>Deploy an app</strong> and copy the Embarko prompt.
          Paste it into your AI and ask it to deploy. The app appears in your list once it is live.
        </>,
      ],
      [
        "Which AI tools work with Embarko?",
        <>
          Any AI that can run commands (Claude Code, Codex CLI, Cursor, Gemini CLI and others) can deploy
          with the prompt. Claude also has a connector that deploys from inside the chat. See{" "}
          <A href="/docs/connectors">Connectors</A>.
        </>,
      ],
      [
        "Do I need an account for the first deploy?",
        "No. A first deploy without an account is temporary for 24 hours. Sign in and claim it to keep it, or deploy through the connector and it is yours straight away.",
      ],
    ],
  },
  {
    group: "Your apps",
    items: [
      [
        "Where is my app served?",
        <>
          At <strong>your-app-name.embarko.app</strong>, or on your own domain if you add one.
        </>,
      ],
      [
        "Can I use my own domain?",
        <>
          Yes, on paid plans. Open the app, go to <strong>Domain</strong> and follow the steps, or ask
          your AI to set it up for you. See <A href="/docs/custom-domain">Own domain</A>.
        </>,
      ],
      [
        "How do I update my app?",
        "Ask your AI to make the change and deploy again under the same app name. The new version replaces the old one.",
      ],
      [
        "My app needs an API key or other secret. Where do I put it?",
        <>
          In the app&apos;s <strong>App setup</strong> tab. Never paste secrets into the code or into
          embarko.json. Your AI can tell you exactly which keys it needs.
        </>,
      ],
      [
        "Can my app run scheduled jobs?",
        <>
          Yes. Your AI lists them in embarko.json and Embarko runs them on time, up to 5 per app. See{" "}
          <A href="/docs/schedules">Schedules</A>.
        </>,
      ],
      [
        "Can I delete an app?",
        "Yes. Open the app, go to Settings and delete it, or ask your AI to do it. Deleting is permanent.",
      ],
    ],
  },
  {
    group: "When something goes wrong",
    items: [
      [
        "My app shows “Needs attention”. What now?",
        "The latest deployment failed or the app crashed. Click “See what happened”, then use “Fix with your AI”: it gives you something to paste into your AI so it can fix and redeploy.",
      ],
      [
        "My app shows “Not online”.",
        "Nothing is deployed yet or the last version was removed. Ask your AI to deploy it again.",
      ],
      [
        "Where are the logs?",
        "Open the app and expand Logs. Most of the time you do not need them: your AI reads the logs itself when you ask it to fix a problem.",
      ],
      [
        "Is Embarko down?",
        <>
          Check <A href="/status">Status</A>. If your app alone is affected, it is usually something in the
          app itself; ask your AI first.
        </>,
      ],
    ],
  },
  {
    group: "Plans and billing",
    items: [
      [
        "Is there a free plan?",
        <>
          Yes. Free covers unlimited static websites and a small number of dynamic apps. Paid plans add
          more dynamic apps, your own domain and multiple versions. See <A href="/pricing">Pricing</A>.
        </>,
      ],
      [
        "How are apps counted?",
        "Each deployed app counts once against your plan. Two apps that talk to each other count as two.",
      ],
      [
        "Where do I manage billing?",
        <>
          In <A href="/app">Account</A> under Plan and Billing.
        </>,
      ],
    ],
  },
  {
    group: "Privacy and security",
    items: [
      [
        "Who can see my app?",
        "Anyone with the link. Embarko does not add logins to your app; ask your AI to build one if you need it.",
      ],
      [
        "How do I report abuse or a security issue?",
        <>
          See <A href="/abuse">Report abuse</A> or <A href="/security">Security</A>.
        </>,
      ],
    ],
  },
];

export default function FaqPage() {
  return (
    <DocumentPage title="Frequently asked questions" fullFooter>
      <Section>
        <P>
          <strong>Have a question? Ask your AI agent first.</strong> If the Embarko connector or skill
          is installed, your AI can check your app and fix most things. Just ask, for example “Why is my
          app not online?”
        </P>
        <P>
          Not connected yet? See <A href="/docs/connectors">Connectors</A> or the{" "}
          <A href="https://github.com/embarko-ai/skill">Embarko skill</A>. Still stuck?{" "}
          <A href="/support">Contact us</A>.
        </P>
      </Section>

      {FAQ.map(({ group, items }) => (
        <Section key={group} title={group}>
          <div className="divide-y divide-border">
            {items.map(([q, a]) => (
              <details key={q} className="group py-3">
                <summary className="cursor-pointer list-none text-[16px] font-medium leading-[1.4] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="mr-2 inline-block text-muted-foreground transition-transform group-open:rotate-90">
                    ▸
                  </span>
                  {q}
                </summary>
                <div className="mt-2 pl-5 text-[15.5px] leading-[1.6] text-muted-foreground">{a}</div>
              </details>
            ))}
          </div>
        </Section>
      ))}
    </DocumentPage>
  );
}
