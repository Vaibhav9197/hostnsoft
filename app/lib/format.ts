// Small display helpers used across the console.

export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.round((now - then) / 1000);
  if (s < 0) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

export const STATUS_LABEL: Record<string, string> = {
  running: "Running",
  building: "Building",
  crashed: "Crashed",
  sleeping: "Sleeping",
  failed: "Failed",
  live: "Live",
  queued: "Queued",
  deploying: "Deploying",
  superseded: "Superseded",
  rolled_back: "Rolled back",
  active: "Active",
  pending: "Pending",
  error: "Error",
};

// Maps a status to a semantic tone used by the status pill styles.
export function statusTone(status: string): "ok" | "warn" | "err" | "muted" {
  switch (status) {
    case "running":
    case "live":
    case "active":
      return "ok";
    case "building":
    case "deploying":
    case "queued":
    case "sleeping":
    case "pending":
      return "warn";
    case "crashed":
    case "failed":
    case "error":
      return "err";
    default:
      return "muted";
  }
}
