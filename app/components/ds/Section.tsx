import { cx } from "./cx";

type SectionProps = {
  id?: string;
  /** id of the heading inside, for aria-labelledby. */
  labelledBy?: string;
  className?: string;
  children: React.ReactNode;
  /** Wrap content in the 1240px column. Default true. */
  wrap?: boolean;
};

/** A page section, spaced one "chapter" (--ds-chapter) from the one above. */
export function Section({ id, labelledBy, className, children, wrap = true }: SectionProps) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cx("ds-section", className)}>
      {wrap ? <div className="ds-wrap">{children}</div> : children}
    </section>
  );
}

type HeadingProps = {
  id?: string;
  /** Mono uppercase label, e.g. "01 — How it works". */
  kicker?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  /** Right-side slot, e.g. a "See all" ButtonLink. Ignored when centered. */
  action?: React.ReactNode;
  center?: boolean;
};

export function SectionHeading({ id, kicker, title, sub, action, center }: HeadingProps) {
  return (
    <div className={cx("ds-sech", center && "ds-sech-center")}>
      <div>
        {kicker && <span className="ds-kicker">{kicker}</span>}
        <h2 id={id}>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {!center && action}
    </div>
  );
}
