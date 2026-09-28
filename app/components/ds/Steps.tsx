import { Fragment } from "react";

import { cx } from "./cx";

export const DEFAULT_STEPS = ["Copy", "Paste into your agent", "Share your link"];

/** The quiet "Copy → Paste into your agent → Share your link" row under a CTA. */
export function Steps({ steps = DEFAULT_STEPS, className }: { steps?: string[]; className?: string }) {
  return (
    <ol className={cx("ds-steps", className)}>
      {steps.map((step, i) => (
        <Fragment key={step}>
          {i > 0 && (
            <li aria-hidden="true">
              <i className="ds-arrow">→</i>
            </li>
          )}
          <li>{step}</li>
        </Fragment>
      ))}
    </ol>
  );
}
