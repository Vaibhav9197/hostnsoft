"use client";

import { Copy } from "lucide-react";

import { COPIED_LABEL, CopyPromptButton } from "../CopyPromptButton";
import { buttonClass, type ButtonSize } from "./Button";

type Props = {
  /** Defaults to "lg". */
  size?: ButtonSize;
  /** Glowing primary (default) or the plain dark primary. */
  glow?: boolean;
  /** Fires after every click — hook analytics here. */
  onClicked?: () => void;
  /** Fires only on a successful copy. */
  onCopied?: () => void;
  /** Overrides the label. Keep the default unless DESIGN.md says otherwise. */
  label?: string;
  /** What to copy. Defaults to the deploy prompt for the current page. */
  text?: string;
  className?: string;
};

/** The one primary action on public pages: copy the Embarko deploy prompt. */
export function PrimaryCta({ size = "lg", glow = true, onClicked, onCopied, label = "Copy deployment prompt", text, className }: Props) {
  return (
    <CopyPromptButton
      className={buttonClass(glow ? "glow" : "primary", size, className)}
      copiedChildren={COPIED_LABEL}
      onClicked={onClicked}
      onCopied={onCopied}
      text={text}
    >
      <Copy aria-hidden="true" />
      {label}
    </CopyPromptButton>
  );
}
