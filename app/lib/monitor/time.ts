/**
 * Clock helpers for the monitor. Everything is stored in UTC ISO strings;
 * report times and quiet hours are read in the settings' time zone.
 */

export const HOUR = 3600_000;
export const DAY = 24 * HOUR;

export const iso = (ms: number) => new Date(ms).toISOString();

export interface LocalParts {
  /** YYYY-MM-DD in the time zone. */
  date: string;
  /** HH:MM, 24-hour. */
  hm: string;
  /** 0 = Sunday. */
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function localParts(ms: number, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hm: `${get("hour")}:${get("minute")}`,
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
  };
}

/** True when `hm` falls inside [start, end), wrapping past midnight. */
export function inWindow(hm: string, start: string, end: string): boolean {
  if (start === end) return false;
  return start < end ? hm >= start && hm < end : hm >= start || hm < end;
}

/** "Tue 27 Oct" in the time zone. */
export function dayLabel(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short" }).format(new Date(ms));
}
