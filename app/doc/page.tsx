"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check } from "lucide-react";
import { Header } from "../components/Header";
import { LoginModal } from "../components/LoginModal";
import { DEPLOY_PROMPT } from "../lib/deployPrompt";
import { CopyPromptButton, COPIED_LABEL } from "../components/CopyPromptButton";

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "install-skill", label: "Install the skill" },
  { id: "quick-start", label: "Quick start" },
  { id: "authentication", label: "Authentication" },
  { id: "deploy", label: "Deploy" },
  { id: "storage-requirements", label: "Storage requirements" },
  { id: "errors", label: "Errors" },
];

const ERRORS = [
  { code: "unauthorized", status: "401", meaning: "DEPLOY_TOKEN missing, invalid, or revoked" },
  { code: "invalid_app_name", status: "400", meaning: "X-App-Name missing, or doesn't match ^[a-z0-9-]+$" },
  { code: "app_name_taken", status: "409", meaning: "This exact app name already belongs to a different company — names are unique platform-wide" },
  { code: "app_name_check_failed", status: "502", meaning: "Couldn't verify app-name availability (an internal service was unreachable) — transient, safe to retry" },
  { code: "invalid_app_version", status: "400", meaning: "X-App-Version doesn't match ^[a-zA-Z0-9._-]+$" },
  { code: "missing_source_file", status: "400", meaning: "No source file in the multipart upload" },
  { code: "unsupported_storage_pattern", status: "422", meaning: "App calls window.storage — see Storage requirements" },
  { code: "deploy_failed", status: "500", meaning: "The build or deploy step itself failed — a catch-all; read details for the actual underlying error" },
];


function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.85em] text-neutral-800">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-neutral-900 p-4 font-mono text-xs leading-relaxed text-neutral-200">
      <code>{children}</code>
    </pre>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-2xl font-bold text-neutral-950">
      {children}
    </h2>
  );
}

function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-24 text-lg font-semibold text-neutral-950">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-neutral-600">{children}</p>;
}

export default function DocPage() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <Header onAuthClick={() => setLoginOpen(true)} />

      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
          {/* ===== TOC ===== */}
          <nav className="hidden lg:block">
            <div className="sticky top-24 space-y-1">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                Documentation
              </p>
              {TOC.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          {/* ===== Content ===== */}
          <div className="min-w-0 max-w-2xl space-y-16">
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">Embarko Documentation</h1>
            </div>

            {/* Overview */}
            <section className="space-y-4">
              <H2 id="overview">Overview</H2>
              <P>Embarko lets agents deploy apps to a live URL.</P>
              <P>
                Every deploy gets a live URL at <Code>{"<app-name>.app.embarko.ai"}</Code>. A deploy
                token authenticates as a <strong className="text-neutral-950">company</strong> — no
                separate company header is needed, the token itself identifies which company a deploy
                belongs to.
              </P>
              <ul className="space-y-3">
                <li className="text-sm leading-relaxed text-neutral-600">
                  <strong className="text-neutral-950">Projects auto-create on first deploy.</strong> No
                  dashboard step is required beforehand — the first deploy of a new app name creates its
                  project under your token&apos;s company automatically.
                </li>
                <li className="text-sm leading-relaxed text-neutral-600">
                  App names are unique <strong className="text-neutral-950">platform-wide</strong> (an app
                  name is also the live subdomain), not just within your company. If another company
                  already used the exact name you&apos;re deploying, the request fails with{" "}
                  <Code>code: &quot;app_name_taken&quot;</Code> — pick a different name rather than retrying.
                </li>
                <li className="text-sm leading-relaxed text-neutral-600">
                  No anonymous/no-account mode — a deploy token is required for every request.
                </li>
              </ul>
            </section>

            {/* Install the skill */}
            <section className="space-y-4">
              <H2 id="install-skill">Install the skill</H2>

              <div className="overflow-hidden rounded-xl border border-neutral-200">
                <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                  <span className="text-xs font-medium text-neutral-500">
                    Copy prompt for agent · Paste in your agent
                  </span>
                  <CopyPromptButton
                    className="inline-flex items-center gap-1.5 rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black"
                    copiedChildren={
                      <>
                        {COPIED_LABEL}
                        <Check className="h-3 w-3" />
                      </>
                    }
                  >
                    Copy
                    <Copy className="h-3 w-3" />
                  </CopyPromptButton>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-neutral-700">
                  {DEPLOY_PROMPT}
                </pre>
              </div>

              <P>
                The plain HTTP call above works without installing anything, and is what the copy prompt
                leads with — no install step required to get started.
              </P>
              <P>
                For repeated use, install the skill instead: it wraps the same call in a script with
                packaging, storage-pattern pre-checks, and error-code-aware guidance, so you don&apos;t
                have to re-derive any of the above by hand each time.
              </P>
              <CodeBlock>{`npx skills add embarko-ai/skill --skill embarko-deploy -g`}</CodeBlock>
              <P>
                For a repo-local install instead of global, drop the <Code>-g</Code> flag. This is the
                preferred way to work with Embarko repeatedly — reach for the raw <Code>curl</Code> above
                only for a one-off call or when you can&apos;t install anything.
              </P>
            </section>

            {/* Quick start */}
            <section className="space-y-4">
              <H2 id="quick-start">Quick start</H2>
              <P>Deploy an app in two steps.</P>
              <P>
                <strong className="text-neutral-950">1. Get a deploy token</strong> — see{" "}
                <a href="#authentication" className="font-medium text-neutral-950 underline underline-offset-2">
                  Authentication
                </a>
                .
              </P>
              <P>
                <strong className="text-neutral-950">2. Package and deploy:</strong>
              </P>
              <CodeBlock>{`tar -czf /tmp/my-app.tar.gz --exclude=node_modules --exclude=.git -C /path/to/app .

curl -X POST "https://ship.embarko.ai/apps" \\
  -H "Authorization: Bearer $DEPLOY_TOKEN" \\
  -H "X-App-Name: my-app" \\
  -H "X-App-Version: $(git rev-parse --short HEAD)" \\
  -F "source=@/tmp/my-app.tar.gz"`}</CodeBlock>
              <P>
                Check the response for <Code>&quot;success&quot;: true</Code> and a live <Code>url</Code>.
                See{" "}
                <a href="#deploy" className="font-medium text-neutral-950 underline underline-offset-2">
                  Deploy
                </a>{" "}
                for the full response shape, and{" "}
                <a href="#errors" className="font-medium text-neutral-950 underline underline-offset-2">
                  Errors
                </a>{" "}
                for what a failed response looks like. If you&apos;ve installed the skill (see above),
                prefer running it over hand-rolling this <Code>curl</Code> call — it packages the
                tarball, runs the storage-pattern pre-check locally, and surfaces the error{" "}
                <Code>code</Code> for you.
              </P>
            </section>

            {/* Authentication */}
            <section className="space-y-4">
              <H2 id="authentication">Authentication</H2>
              <P>
                Every deploy request is authenticated with a{" "}
                <strong className="text-neutral-950">company deploy token</strong>:
              </P>
              <CodeBlock>{`Authorization: Bearer <token>`}</CodeBlock>

              <div className="space-y-3 pt-2">
                <H3 id="getting-a-token">Getting a token</H3>
                <P>
                  Deploy tokens are created from the dashboard — there is currently no API-driven or
                  agent-assisted way to mint one:
                </P>
                <ol className="list-decimal space-y-2 pl-5">
                  <li className="text-sm leading-relaxed text-neutral-600">
                    Go to <Code>https://embarko.ai/login</Code> and sign in (or create an account).
                  </li>
                  <li className="text-sm leading-relaxed text-neutral-600">
                    Open your company&apos;s <strong className="text-neutral-950">Deploy tokens</strong>{" "}
                    page (<Code>https://embarko.ai/app/tokens</Code>).
                  </li>
                  <li className="text-sm leading-relaxed text-neutral-600">
                    Enter a label (e.g. <Code>&quot;CI pipeline&quot;</Code>) and click{" "}
                    <strong className="text-neutral-950">Create token</strong> — it&apos;s shown once and
                    cannot be retrieved again. Tokens are prefixed <Code>hns_</Code>.
                  </li>
                  <li className="text-sm leading-relaxed text-neutral-600">
                    Set it as <Code>DEPLOY_TOKEN</Code> in your environment.
                  </li>
                </ol>
                <P>
                  Deploy tokens authenticate deploys only — per the dashboard&apos;s own note, they are{" "}
                  <strong className="text-neutral-950">not used to sign in</strong> to the dashboard
                  itself.
                </P>
              </div>

              <div className="space-y-3 pt-2">
                <H3 id="rotating-a-token">Rotating or revoking a token</H3>
                <P>
                  From the same page: <strong className="text-neutral-950">Rotate</strong> issues a
                  replacement under the same label — the old token keeps working for{" "}
                  <strong className="text-neutral-950">one hour</strong> afterward, so an in-flight CI
                  run doesn&apos;t break. <strong className="text-neutral-950">Revoke</strong> disables a
                  token immediately; use this if a token has leaked.
                </P>
              </div>

              <div className="space-y-3 pt-2">
                <H3 id="storing-the-token">Storing the token</H3>
                <CodeBlock>{`export DEPLOY_TOKEN="..."`}</CodeBlock>
                <P>
                  or store it in a local credentials file (e.g. <Code>~/.embarko/credentials</Code>,{" "}
                  <Code>chmod 600</Code>) so it doesn&apos;t need to be re-entered.
                </P>
              </div>
            </section>

            {/* Deploy */}
            <section className="space-y-4">
              <H2 id="deploy">Deploy</H2>
              <p className="font-mono text-sm font-semibold text-neutral-950">POST /apps</p>

              <P>Headers:</P>
              <ul className="space-y-3">
                <li className="text-sm leading-relaxed text-neutral-600">
                  <Code>Authorization: Bearer &lt;token&gt;</Code> — required. Identifies both the caller
                  and its company; there is no separate company header.
                </li>
                <li className="text-sm leading-relaxed text-neutral-600">
                  <Code>X-App-Name</Code> — required, lowercase letters/numbers/dashes only. Auto-creates
                  its project on first use — see{" "}
                  <a href="#overview" className="font-medium text-neutral-950 underline underline-offset-2">
                    Overview
                  </a>{" "}
                  on the platform-wide uniqueness rule and <Code>app_name_taken</Code>.
                </li>
                <li className="text-sm leading-relaxed text-neutral-600">
                  <Code>X-App-Version</Code> — optional, defaults to a timestamp if omitted. Pass an
                  explicit unique value (git SHA, semver tag) — a floating/reused tag can serve a stale
                  build.
                </li>
              </ul>

              <P>
                Body: multipart, field <Code>source</Code>, a <Code>.tar.gz</Code> of the app&apos;s
                source.
              </P>

              <P>Response (success):</P>
              <CodeBlock>{`{
  "success": true,
  "message": "Deployment successful!",
  "version": "abc1234",
  "image": "my-app:abc1234",
  "memory": "256MB",
  "url": "https://my-app.app.embarko.ai"
}`}</CodeBlock>
            </section>

            {/* Storage requirements */}
            <section className="space-y-4">
              <H2 id="storage-requirements">Storage requirements</H2>
              <P>
                Do not use <Code>window.storage</Code> — it&apos;s an API specific to Claude Artifacts&apos;
                sandbox and doesn&apos;t exist on Embarko. Apps calling it are rejected at deploy time
                (<Code>422</Code>, before any build is attempted):
              </P>
              <CodeBlock>{`{
  "error": "Unsupported storage pattern detected",
  "code": "unsupported_storage_pattern",
  "detail": "This app calls window.storage, an API specific to Claude Artifacts' sandbox...",
  "filesDetected": ["src/app.jsx"],
  "docs": "https://embarko.ai/docs#storage-requirements"
}`}</CodeBlock>
              <P>
                Use SQLite (<Code>better-sqlite3</Code>) for simple key-value/document data, or PGlite (
                <Code>@electric-sql/pglite</Code>) for relational data needing joins — either way, write
                to a path under the <Code>DATA_DIR</Code> environment variable so data persists across
                redeploys.
              </P>
            </section>

            {/* Errors */}
            <section className="space-y-4">
              <H2 id="errors">Errors</H2>
              <P>
                Every non-2xx response includes a machine-readable <Code>code</Code> field alongside the
                human-readable <Code>error</Code> — branch on <Code>code</Code>, not on{" "}
                <Code>error</Code>&apos;s wording, which can change without notice.
              </P>

              <div className="overflow-x-auto rounded-xl border border-neutral-200">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50">
                      <th className="px-4 py-3 font-semibold text-neutral-950">code</th>
                      <th className="px-4 py-3 font-semibold text-neutral-950">Status</th>
                      <th className="px-4 py-3 font-semibold text-neutral-950">Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ERRORS.map((row, i) => (
                      <tr key={row.code} className={i !== ERRORS.length - 1 ? "border-b border-neutral-200" : ""}>
                        <td className="px-4 py-3 align-top font-mono text-xs text-neutral-800">{row.code}</td>
                        <td className="px-4 py-3 align-top font-mono text-xs text-neutral-500">{row.status}</td>
                        <td className="px-4 py-3 align-top text-neutral-600">{row.meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <P>Example:</P>
              <CodeBlock>{`{ "error": "App name \\"my-app\\" is already in use by a different company", "code": "app_name_taken" }`}</CodeBlock>
            </section>
          </div>
        </div>
      </div>

      {/* ===== Footer ===== */}
      <footer className="border-t border-neutral-200 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-neutral-500 sm:flex-row">
          <div className="flex items-center gap-2 font-semibold text-neutral-950">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-950" />
            Embarko
          </div>
          <span>© 2026 Embarko</span>
          <Link href="/pricing" className="hover:text-neutral-950">Pricing</Link>
        </div>
      </footer>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
