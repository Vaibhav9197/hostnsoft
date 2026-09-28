import { Sparkles } from "lucide-react";

import { GlowBackdrop } from "./GlowBackdrop";
import { Pill } from "./Pill";
import { PrimaryCta } from "./PrimaryCta";
import { Serif } from "./Serif";
import { Steps } from "./Steps";
import { cx } from "./cx";

type Props = {
  id?: string;
  pill?: React.ReactNode;
  /** Defaults to "Seen enough? / Ship something." */
  title?: React.ReactNode;
  line?: React.ReactNode;
  steps?: string[];
  /** Replaces the PrimaryCta (e.g. to pass onClicked from a client page). */
  action?: React.ReactNode;
  className?: string;
};

/** The closing band every public page ends on: pill, big heading, line, PrimaryCta, Steps. */
export function CtaSection({
  id = "ship",
  pill = (
    <>
      <Sparkles aria-hidden="true" />
      Your turn
    </>
  ),
  title = (
    <>
      Seen enough?
      <br />
      <Serif>Ship</Serif> something.
    </>
  ),
  line = "Copy the Embarko prompt, paste it into your AI agent, and your app goes live on its own link.",
  steps,
  action,
  className,
}: Props) {
  const h = `${id}-h`;
  return (
    <section className={cx("ds-cta", className)} id={id} aria-labelledby={h}>
      <GlowBackdrop />
      <Pill grad>{pill}</Pill>
      <h2 id={h}>{title}</h2>
      {line && <p>{line}</p>}
      <div className="ds-ctas">{action ?? <PrimaryCta />}</div>
      <Steps steps={steps} />
    </section>
  );
}
