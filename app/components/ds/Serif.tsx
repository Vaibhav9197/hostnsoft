import { cx } from "./cx";

/** The italic serif accent — one word per headline. `grad` fills it with the brand gradient. */
export function Serif({ children, grad }: { children: React.ReactNode; grad?: boolean }) {
  return <span className={cx("ds-serif", grad && "ds-gtext")}>{children}</span>;
}
