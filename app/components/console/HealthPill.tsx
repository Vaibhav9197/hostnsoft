import { cn } from "@/app/lib/utils";
import type { ProjectHealth } from "@/app/lib/types";

/**
 * Whether an app is up, in the three words the product uses.
 *
 * The six health values the API reports are an infrastructure vocabulary —
 * "crashed", "not_deployed", an allocation that is "stopped". Collapsing them
 * to Running / Not online / Needs attention is deliberate: the panel's job is
 * to say whether the app is serving and whether anyone needs to act, and a
 * reader cannot act differently on "crashed" than on "stopped".
 */
type Tone = "live" | "offline" | "attention";

const TONES: Record<ProjectHealth, { label: string; tone: Tone }> = {
  running: { label: "Running", tone: "live" },
  /* Deliberately not its own state. A deploy in flight resolves on its own
     within seconds, and a third colour that means "wait" only adds a thing to
     interpret. */
  starting: { label: "Starting", tone: "offline" },
  crashed: { label: "Needs attention", tone: "attention" },
  stopped: { label: "Not online", tone: "offline" },
  not_deployed: { label: "Not online", tone: "offline" },
  /* We failed to reach the health service — which says nothing about the app.
     Claiming it is down would be worse than admitting we don't know. */
  unknown: { label: "Unknown", tone: "offline" },
};

const STYLES: Record<Tone, { text: string; dot: string }> = {
  live: { text: "text-success", dot: "bg-success" },
  offline: { text: "text-muted-foreground", dot: "bg-[var(--ink-faint)]" },
  attention: { text: "text-destructive", dot: "bg-destructive" },
};

/* Two densities, one vocabulary. A card in a grid wants the lightest mark that
   still reads, while the app's own page is answering "is it up?" as its
   headline fact and can carry the weight. What must not differ is the word:
   this component exists so no surface invents its own name for a state. */
const CHROME: Record<Tone, string> = {
  live: "bg-success/12 border-success/30",
  offline: "bg-elevated border-input",
  attention: "bg-destructive/12 border-destructive/30",
};

export function HealthPill({
  health,
  variant = "plain",
  className,
}: {
  health: ProjectHealth;
  variant?: "plain" | "pill";
  className?: string;
}) {
  const { label, tone } = TONES[health] ?? TONES.unknown;
  const style = STYLES[tone];

  return (
    /* The dot is decorative — the word carries the meaning. Colour alone must
       never be the signal, both for colour-blind readers and because these
       three greys and reds are hard to tell apart at 8px. */
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap",
        variant === "pill"
          ? cn("rounded-full border px-2.5 py-0.5 font-mono text-[0.72rem] font-semibold", CHROME[tone])
          : "text-xs font-medium",
        style.text,
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
