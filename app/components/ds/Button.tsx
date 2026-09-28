import Link from "next/link";

import { cx } from "./cx";

export type ButtonVariant = "primary" | "glow" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

/** Class string for a ds button — use on any element (a, button, CopyPromptButton). */
export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", extra?: string) {
  return cx(
    "ds-btn",
    (variant === "primary" || variant === "glow") && "ds-btn-pri",
    variant === "glow" && "ds-btn-glow",
    variant === "ghost" && "ds-btn-ghost",
    size !== "md" && `ds-btn-${size}`,
    extra,
  );
}

type Props = {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
  /** External links open in a new tab. */
  external?: boolean;
};

/** A link styled as a button. For the copy-prompt action use PrimaryCta. */
export function ButtonLink({ href, variant = "secondary", size = "md", className, children, external }: Props) {
  const cls = buttonClass(variant, size, className);
  if (external || href.startsWith("#")) {
    return (
      <a href={href} className={cls} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
