import { STATUS_LABEL, statusTone } from "../../lib/format";

export function StatusPill({ status }: { status: string }) {
  const tone = statusTone(status);
  const pulse = status === "building" || status === "deploying" || status === "queued";
  return (
    <span className={`st st-${tone}${pulse ? " st-pulse" : ""}`}>
      <span className="st-dot" aria-hidden="true" />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
