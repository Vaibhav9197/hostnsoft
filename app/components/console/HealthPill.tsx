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
  /* Deliberately not its own colour. A deploy in flight resolves on its own,
     and a third colour that means "wait" only adds a thing to interpret — it
     gets motion instead, which reads as "working" without being a fourth
     status to learn. */
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
  /** A deploy is running right now. Overrides health, because "Not online" is
   *  true but useless while a build is in flight — the app is not online *yet*,
   *  and the thing to say is that something is happening. The API only moves
   *  `health` once the allocation exists, which can be a minute or more after
   *  the deploy starts, so without this the card sits there looking idle. */
  deploying = false,
  variant = "plain",
  labelOnHover = false,
  className,
}: {
  health: ProjectHealth;
  deploying?: boolean;
  variant?: "plain" | "pill";
  /** Dot only, with the word sliding in to its left when the enclosing
   *  `group` (the app card) is hovered or focused. For grids, where a word on
   *  every card is noise. "Needs attention" ignores it and always shows the
   *  word: it's the one state somebody must not miss, and colour alone can't
   *  carry it. Touch screens have no hover, so they always show the word. */
  labelOnHover?: boolean;
  className?: string;
}) {
  const resolved = TONES[health] ?? TONES.unknown;
  const { label, tone } = deploying ? { label: "Deploying", tone: "offline" as const } : resolved;
  const style = STYLES[tone];

  /* Motion is the whole signal for a state that means "wait" — the word alone
     is indistinguishable from a resting state at a glance, and this is the one
     moment somebody is actually watching the card. It gets the foreground ink
     rather than the faint grey the other offline states use: a pulse nobody
     can see is the same as no pulse. */
  const working = deploying || health === "starting";
  const hideLabel = labelOnHover && tone !== "attention";

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
        working ? "text-foreground" : style.text,
        className,
      )}
    >
      {/* A ring expanding out of the dot, rather than the dot fading in place.
          Fading a 6px grey dot in and out is a change almost nobody notices;
          something moving outwards is caught by peripheral vision, which is
          the point — the reader is looking at the app name, not the pill. */}
      {/* With labelOnHover the word comes first, so the dot holds the card's
          right edge and the word grows leftwards out of it. It stays in the
          DOM while hidden, so screen readers still hear the state. */}
      {hideLabel && (
        <span className="overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 [@media(hover:hover)]:max-w-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:max-w-[10rem] [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:max-w-[10rem] [@media(hover:hover)]:group-focus-within:opacity-100">
          {label}
        </span>
      )}
      {working ? (
        <span className="relative flex size-2.5 shrink-0 items-center justify-center" aria-hidden="true">
          <span className="absolute inline-flex size-2.5 animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
      ) : (
        <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
      )}
      {!hideLabel && label}
      {/* Says the same thing to a screen reader that the pulse says to a
          sighted reader: this is not a settled state, come back to it. */}
      {working && <span className="sr-only">, in progress</span>}
    </span>
  );
}
