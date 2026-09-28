import { cx } from "./cx";

type Props = {
  children: React.ReactNode;
  /** Lift on hover — only when the whole card is clickable. */
  lift?: boolean;
  as?: "div" | "article" | "li";
  className?: string;
};

/** The white rounded tile shell (22px radius, soft shadow). */
export function Card({ children, lift, as: Tag = "div", className }: Props) {
  return <Tag className={cx("ds-card", lift && "ds-card-lift", className)}>{children}</Tag>;
}
