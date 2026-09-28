import Link from "next/link";

import { cx } from "./cx";

type Props = {
  children: React.ReactNode;
  /** Gradient fill — for the one eyebrow above a hero or closing CTA. */
  grad?: boolean;
  /** Makes it a link (category chips, filters). */
  href?: string;
  className?: string;
};

/** Small rounded label: eyebrows, categories, tags. */
export function Pill({ children, grad, href, className }: Props) {
  const cls = cx("ds-pill", grad && "ds-pill-grad", className);
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  );
}
