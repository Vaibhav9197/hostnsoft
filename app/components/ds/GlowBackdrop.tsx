import { cx } from "./cx";

/**
 * Soft purple/pink radial glow behind a section. Decoration only. The parent
 * must be `position:relative; isolation:isolate` (Hero, CtaSection and
 * Section already are).
 */
export function GlowBackdrop({ position = "bottom", className }: { position?: "bottom" | "top" | "full"; className?: string }) {
  return <div aria-hidden="true" className={cx("ds-glow", position !== "bottom" && `ds-glow-${position}`, className)} />;
}
