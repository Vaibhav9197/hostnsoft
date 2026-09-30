import { cx } from "./cx";
import { Pill } from "./Pill";
import { Steps } from "./Steps";

type Props = {
  /** Small pill above the headline. */
  eyebrow?: React.ReactNode;
  /** Your own element above the headline, in place of the eyebrow pill (e.g. a link chip). */
  chip?: React.ReactNode;
  /** The h1. Put one <Serif> word in it. */
  title: React.ReactNode;
  sub?: React.ReactNode;
  /** CTA row — normally <PrimaryCta /> plus at most one secondary ButtonLink. */
  actions?: React.ReactNode;
  /** Pass true for the default steps, or your own list. */
  steps?: boolean | string[];
  className?: string;
};

/** Centered page hero: eyebrow pill, big headline, sub line, CTA row. */
export function Hero({ eyebrow, chip, title, sub, actions, steps, className }: Props) {
  return (
    <section className={cx("ds-hero", className)}>
      {chip ?? (eyebrow && <Pill grad>{eyebrow}</Pill>)}
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
      {actions && <div className="ds-ctas">{actions}</div>}
      {steps && <Steps steps={Array.isArray(steps) ? steps : undefined} />}
    </section>
  );
}
