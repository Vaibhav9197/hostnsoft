"use client";

import Link from "next/link";
import { useEffect } from "react";

type Tool = {
  id: string;
  name: string;
  sub: string;
  format: string;
  href: string;
  mark: string;
  recommended?: boolean;
};

const TOOLS: Tool[] = [
  { id: "claude", name: "Claude", sub: "Claude Code · Cowork · Desktop", format: ".skill", href: "/skills/hostnsoft-deploy.skill", mark: "✻", recommended: true },
  { id: "chatgpt", name: "ChatGPT", sub: "Custom GPT · Projects", format: ".md", href: "/skills/hostnsoft-deploy-chatgpt.md", mark: "◎" },
  { id: "gemini", name: "Gemini", sub: "Gems", format: ".md", href: "/skills/hostnsoft-deploy-gemini.md", mark: "✦" },
  { id: "cursor", name: "Cursor / Windsurf", sub: "Agent rule · AGENTS.md", format: ".md", href: "/skills/hostnsoft-deploy-cursor.md", mark: "❯" },
  { id: "cli", name: "Any tool / CLI", sub: "Standalone bash script", format: ".sh", href: "/skills/hostnsoft-deploy.sh", mark: "$" },
];

export function SkillDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <div
      className={`overlay${open ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal skill-modal" role="dialog" aria-modal="true" aria-label="Get the deploy skill">
        <button className="close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <h3>Deploy an app</h3>
        <p className="sub">
          Add the hostnsoft deploy skill to your AI tool, then just say “deploy this.” Pick your tool:
        </p>

        <div className="skill-list">
          {TOOLS.map((t) => (
            <div className="skill-row" key={t.id}>
              <span className="skill-mark" aria-hidden="true">{t.mark}</span>
              <div className="skill-meta">
                <div className="skill-name">
                  {t.name}
                  {t.recommended && <span className="skill-rec">Recommended</span>}
                </div>
                <div className="skill-sub">{t.sub}</div>
              </div>
              <span className="skill-fmt">{t.format}</span>
              <a className="con-btn ghost sm" href={t.href} download>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" /></svg>
                Download
              </a>
            </div>
          ))}
        </div>

        <div className="skill-foot">
          Then <Link href="/app/tokens" onClick={onClose}>create a deploy token</Link> and export it as{" "}
          <code>HOSTNSOFT_TOKEN</code>.
        </div>
      </div>
    </div>
  );
}
