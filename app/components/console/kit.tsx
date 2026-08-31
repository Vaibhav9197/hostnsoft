import * as React from "react";

import { cn } from "@/app/lib/utils";

// Shared building blocks for every console page — softer / modern dark theme,
// built on Tailwind + shadcn tokens (subtle rounding, soft borders, gentle
// elevation). No raw var() arbitraries: colors come from the token bridge in
// app/base.css (bg-card, border-border, text-muted-foreground, bg-primary/10…).

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-6", className)}>{children}</div>;
}

export function Panel({
  children,
  className,
  padded,
  tone,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  tone?: "danger";
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card shadow-sm",
        tone === "danger" ? "border-destructive/35" : "border-border",
        padded && "p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelTitle({ children, tone }: { children: React.ReactNode; tone?: "danger" }) {
  return (
    <h2 className={cn("text-base font-bold", tone === "danger" ? "text-destructive" : "text-foreground")}>
      {children}
    </h2>
  );
}

export function EmptyState({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-input bg-card/50 px-6 py-14 text-center">
      <h3 className="text-[1.1rem] font-bold text-foreground">{title}</h3>
      {children && <p className="mx-auto mt-2 max-w-[44ch] text-[0.92rem] leading-relaxed text-muted-foreground">{children}</p>}
    </div>
  );
}

const ALERT_STYLES = {
  err: "text-destructive bg-destructive/10 border-destructive/30",
  info: "text-info bg-info/10 border-info/30",
  warn: "text-warning bg-warning/10 border-warning/40",
};

export function Alert({
  variant = "err",
  children,
  className,
}: {
  variant?: "err" | "info" | "warn";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", ALERT_STYLES[variant], className)}>{children}</div>
  );
}

export function FactGrid({ children, flush }: { children: React.ReactNode; flush?: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))]",
        flush ? "mt-3.5 gap-3.5" : "overflow-hidden rounded-xl border border-border bg-border gap-px",
      )}
    >
      {children}
    </div>
  );
}

export function Fact({ k, v, mono, flush }: { k: string; v: React.ReactNode; mono?: boolean; flush?: boolean }) {
  return (
    <div className={cn("bg-card", flush ? "p-0" : "p-4")}>
      <div className="font-mono text-[0.66rem] uppercase tracking-[0.1em] text-faint">{k}</div>
      <div className={cn("mt-1 text-[0.95rem] font-medium text-foreground", mono && "font-mono")}>{v}</div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-lg border border-border bg-elevated", className)} />
  );
}

export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "cursor-pointer rounded-md border border-input bg-elevated px-3 py-2 text-sm text-foreground transition-colors",
        "hover:border-input focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-0",
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({
  danger,
  className,
  ...props
}: React.ComponentProps<"button"> & { danger?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "cursor-pointer bg-transparent p-0 text-[0.84rem] font-semibold text-muted-foreground transition-colors hover:text-foreground hover:underline disabled:cursor-default disabled:opacity-50",
        danger && "text-destructive hover:text-destructive",
        className,
      )}
      {...props}
    />
  );
}

export function Tag({ children, tone }: { children: React.ReactNode; tone?: "warn" }) {
  return (
    <span
      className={cn(
        "ml-2 rounded-full border border-border px-2 py-[0.1em] font-mono text-[0.62rem] uppercase tracking-[0.08em] text-faint",
        tone === "warn" && "border-transparent p-0 text-[0.7rem] normal-case tracking-normal text-warning",
      )}
    >
      {children}
    </span>
  );
}
