"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

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
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[580px]">
        <DialogHeader>
          <DialogTitle>Deploy an app</DialogTitle>
          <DialogDescription>
            Add the hostnsoft deploy skill to your AI tool, then just say “deploy this.” Pick your tool:
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {TOOLS.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3.5 border border-border bg-background p-3 transition-colors hover:border-input"
            >
              <span className="grid size-[38px] shrink-0 place-items-center border border-input bg-elevated font-mono text-[1.05rem] font-bold text-primary">
                {t.mark}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[0.95rem] font-bold text-foreground">
                  {t.name}
                  {t.recommended && (
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-primary-foreground bg-primary px-1.5 py-0.5">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[0.8rem] text-faint">{t.sub}</div>
              </div>
              <span className="whitespace-nowrap border border-border bg-elevated px-1.5 py-0.5 font-mono text-[0.74rem] text-faint">
                {t.format}
              </span>
              {t.id === "claude" ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={t.href} download>
                    <Download />
                    Download
                  </a>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <Download />
                  Download
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4 text-[0.86rem] text-muted-foreground">
          Then{" "}
          <Link href="/app/tokens" onClick={onClose} className="text-primary underline underline-offset-2">
            create a deploy token
          </Link>{" "}
          and export it as <code className="border border-border bg-elevated px-1 py-0.5 font-mono text-[0.85em] text-foreground">HOSTNSOFT_TOKEN</code>.
        </div>
      </DialogContent>
    </Dialog>
  );
}
