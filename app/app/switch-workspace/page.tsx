"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { CompanyDialog, type CompanyDialogMode } from "../../components/console/CompanyDialog";
import { EmptyState, PageHeader } from "../../components/console/kit";
import { useSession } from "../../lib/session";
import { cn } from "../../lib/utils";
import type { CompanyMembershipSummary } from "../../lib/types";

export default function SwitchCompanyPage() {
  const { companies, activeCompanyId, setActiveCompanyId } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<CompanyDialogMode | null>(null);
  const [target, setTarget] = useState<CompanyMembershipSummary | null>(null);

  function open(nextMode: CompanyDialogMode, company: CompanyMembershipSummary | null) {
    setTarget(company);
    setMode(nextMode);
  }

  function choose(companyId: string) {
    setActiveCompanyId(companyId);
    router.push("/app");
  }

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Switch workspace"
        subtitle="Choose which workspace to work in, or manage them."
        actions={
          <Button onClick={() => open("new", null)}>
            <Plus />
            New workspace
          </Button>
        }
      />

      {companies.length === 0 ? (
        <EmptyState title="No workspaces yet">Create your first workspace to start deploying apps.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {companies.map((c) => {
            const isActive = c.companyId === activeCompanyId;
            return (
              <div
                key={c.companyId}
                className={cn(
                  "group relative flex flex-col gap-4 overflow-hidden rounded-xl border p-5 transition-all duration-150",
                  isActive
                    ? "border-border bg-elevated shadow-sm"
                    : "border-border bg-card hover:-translate-y-0.5 hover:border-input hover:bg-elevated hover:shadow-md",
                )}
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={cn(
                      "grid size-11 shrink-0 place-items-center rounded-lg text-lg font-extrabold transition-transform duration-150",
                      isActive
                        ? "bg-foreground text-background"
                        : "border border-input bg-elevated text-foreground group-hover:scale-105",
                    )}
                  >
                    {c.companyName.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[1.05rem] font-bold text-foreground">{c.companyName}</div>
                  </div>
                  {isActive && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-elevated px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.12em] text-foreground">
                      <Check className="size-3" />
                      Current
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  {isActive ? (
                    <span className="text-[0.82rem] font-medium text-muted-foreground">You’re working here</span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => choose(c.companyId)}
                      className="gap-1.5 group-hover:border-input group-hover:text-foreground"
                      aria-label={`Switch to ${c.companyName}`}
                    >
                      Switch
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  )}
                  {/* Rename and delete are parked for now — the dialog and its
                      handlers stay wired up, only the entry points are hidden.
                  <div className="flex items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      aria-label={`Rename ${c.companyName}`}
                      onClick={() => open("rename", c)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 hover:bg-destructive/12 hover:text-destructive"
                      aria-label={`Delete ${c.companyName}`}
                      onClick={() => open("delete", c)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  */}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CompanyDialog
        mode={mode}
        company={target}
        onClose={() => setMode(null)}
        onDone={(r) => {
          if (r.createdId) router.push("/app");
        }}
      />
    </div>
  );
}
