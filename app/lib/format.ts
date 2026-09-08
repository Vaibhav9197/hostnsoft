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
  // deployment statuses (hostnsoft-api)
  success: "Success",
  failed: "Failed",
  in_progress: "In progress",
  // project health (live, from the deploy service)
  running: "Running",
  starting: "Starting",
  crashed: "Crashed",
  stopped: "Stopped",
  not_deployed: "Not deployed",
  unknown: "Unknown",
  // membership status
  active: "Active",
  invited: "Invited",
  // token status (UI-derived)
  revoked: "Revoked",
  // custom domain statuses
  pending_dns: "Pending DNS",
};

// Maps a status to a semantic tone used by the status pill styles.
export function statusTone(status: string): "ok" | "warn" | "err" | "muted" {
  switch (status) {
    case "success":
    case "active":
    case "running":
      return "ok";
    case "in_progress":
    case "invited":
    case "pending_dns":
    case "starting":
      return "warn";
    case "failed":
    case "revoked":
    case "crashed":
      return "err";
    // "stopped" and "not_deployed" are resting states, not faults, and
    // "unknown" means we couldn't check — all three stay muted, as does
    // anything else we don't recognise.
    default:
      return "muted";
  }
}

// Absolute date, e.g. "Aug 27, 2026".
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Money from minor units, e.g. formatMoney(1500, "USD") → "$15".
// Whole amounts drop the decimals; anything else keeps two.
export function formatMoney(cents: number, currency: string): string {
  const amount = cents / 100;
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(whole ? 0 : 2)} ${currency}`;
  }
}

// Lago plan interval → "/month" style suffix.
export function intervalSuffix(interval: string): string {
  switch (interval) {
    case "monthly":
      return "/month";
    case "yearly":
      return "/year";
    case "weekly":
      return "/week";
    case "quarterly":
      return "/quarter";
    default:
      return interval ? `/${interval}` : "";
  }
}
