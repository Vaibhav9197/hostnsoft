import { STATUS_LABEL, statusTone } from "../../lib/format";
import { cn } from "../../lib/utils";

const TONE_STYLES = {
  ok: "text-success bg-success/12 border-success/30",
  warn: "text-warning bg-warning/12 border-warning/35",
  err: "text-destructive bg-destructive/12 border-destructive/30",
  muted: "text-faint bg-elevated border-input",
};

const DOT_STYLES = {
  ok: "bg-success",
  warn: "bg-warning",
  err: "bg-destructive",
  muted: "bg-faint",
};

export function StatusPill({ status }: { status: string }) {
  const tone = statusTone(status) as keyof typeof TONE_STYLES;
  const pulse = status === "in_progress";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[0.72rem] font-semibold",
        TONE_STYLES[tone],
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", DOT_STYLES[tone], pulse && "animate-pulse")}
        aria-hidden="true"
      />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
