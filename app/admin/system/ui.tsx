"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import type { Actor, Lane } from "../../lib/system/story";

/* Shared pieces for the Live PRD page: colours, the popup shell, the live
   table reader and the human row grid. */

export const ACTOR_LABEL: Record<Actor, string> = {
  user: "Person",
  ai: "AI",
  rule: "Rule",
  system: "System",
  outside: "Outside service",
};

export const ACTOR_COLOR: Record<Actor, string> = {
  user: "var(--lp-user)",
  ai: "var(--lp-ai)",
  rule: "var(--lp-rule)",
  system: "var(--lp-system)",
  outside: "var(--lp-outside)",
};

export const LANE_COLOR: Record<Lane, string> = {
  people: "var(--accent)",
  screens: "var(--info)",
  engine: "var(--ink-soft)",
  background: "var(--warn)",
  data: "var(--lp-data)",
  outside: "var(--ok)",
};

export const JUDGE_LABEL = { human: "a person decides", ai: "AI decides", rule: "a fixed rule decides", mixed: "people, AI and rules" } as const;

export const color = (c: string): CSSProperties => ({ ["--lp-c" as string]: c });

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function shortDate(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone });
}

/* --- popup shell ---------------------------------------------------------- */

/* Locks the page behind a popup and puts the scroll back on close. */
function useScrollLock() {
  useEffect(() => {
    const y = window.scrollY;
    const body = document.body;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width };
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, y);
    };
  }, []);
}

export function Modal({
  label,
  onClose,
  full,
  children,
}: {
  label: string;
  onClose: () => void;
  full?: boolean;
  children: ReactNode;
}) {
  useScrollLock();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div
      className="lp-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} className={`lp-modal${full ? " lp-modal-full" : ""}`}>
        {children}
      </div>
    </div>
  );
}

export function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" className="lp-icon" onClick={onClose} aria-label="Close">
      ✕
    </button>
  );
}

/* --- live table reads --------------------------------------------------- */

export type Column = { name: string; type: string; nullable: boolean; key: boolean; secret: boolean };
export type Link = { from: string; fromColumn: string; to: string; toColumn: string; declared: boolean };
export type TableData = {
  store: string;
  name: string;
  columns: Column[];
  rows: Record<string, unknown>[];
  rowsNote: string | null;
  linksOut: Link[];
  linksIn: Link[];
  readAt: string;
};

type Entry = { data?: TableData; error?: string; promise?: Promise<void> };
const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();

/* At most four reads at once, however many cards come into view together. */
const MAX_PARALLEL = 4;
let running = 0;
const queue: (() => void)[] = [];
function schedule(job: () => Promise<void>): Promise<void> {
  return new Promise((resolve) => {
    const run = () => {
      running++;
      job().finally(() => {
        running--;
        resolve();
        queue.shift()?.();
      });
    };
    if (running < MAX_PARALLEL) run();
    else queue.push(run);
  });
}

export function loadTable(store: string, name: string): void {
  const key = `${store}:${name}`;
  if (cache.has(key)) return;
  const entry: Entry = {};
  cache.set(key, entry);
  entry.promise = schedule(async () => {
    try {
      const res = await fetch(`/api/system/table?db=${encodeURIComponent(store)}&name=${encodeURIComponent(name)}`, { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok) entry.error = body?.error ?? `Couldn’t read this table (${res.status}).`;
      else entry.data = body as TableData;
    } catch {
      entry.error = "Couldn’t reach the server.";
    }
    listeners.forEach((l) => l());
  });
}

/** Reads one table when `enabled` turns true, and only once per page load. */
export function useTable(store: string, name: string | null, enabled = true): Entry & { loading: boolean } {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  useEffect(() => {
    if (name && enabled) loadTable(store, name);
  }, [store, name, enabled]);
  const entry = name ? cache.get(`${store}:${name}`) : undefined;
  return { ...entry, loading: !!name && enabled && !entry?.data && !entry?.error };
}

/* --- the human row grid ------------------------------------------------- */

const SQL_TIME = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

function formatCell(value: unknown, column: Column, timeZone: string): { text: string; title?: string; empty?: boolean } {
  if (column.secret) return { text: "••••", title: "Hidden — secret column" };
  if (value === null || value === undefined || value === "") return { text: "empty", empty: true };
  if (typeof value === "string" && SQL_TIME.test(value)) {
    /* SQLite's CURRENT_TIMESTAMP is UTC with no zone marker. */
    const iso = /Z|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value.replace(" ", "T")}Z`;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      const text = d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone });
      return { text: text.replace(" at", ","), title: value };
    }
  }
  if (typeof value === "object") {
    const json = JSON.stringify(value);
    return { text: json.length > 40 ? `${json.slice(0, 40)}…` : json, title: json };
  }
  const text = String(value);
  return text.length > 60 ? { text: `${text.slice(0, 60)}…`, title: text } : { text };
}

export function RowsGrid({ data, timeZone }: { data: TableData; timeZone: string }) {
  if (data.rowsNote) return <div className="lp-state">{data.rowsNote}</div>;
  if (data.rows.length === 0) return <div className="lp-state">Empty — no rows yet.</div>;
  return (
    <div className="lp-grid-wrap">
      <table className="lp-grid">
        <thead>
          <tr>
            {data.columns.map((c) => (
              <th key={c.name} title={c.type}>
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i}>
              {data.columns.map((c) => {
                const cell = formatCell(row[c.name], c, timeZone);
                return (
                  <td key={c.name} title={cell.title} className={cell.empty ? "lp-empty" : undefined}>
                    {cell.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --- measured arrows ------------------------------------------------------ */

export type Edge = {
  from: string;
  to: string;
  /** "down": bottom → top. "side": right → left. */
  kind?: "down" | "side";
  label?: string;
  labelColor?: string;
  dashed?: boolean;
  color?: string;
  width?: number;
  opacity?: number;
};

type Drawn = Edge & { d: string; lx: number; ly: number };

/** Draws cubic arrows between elements carrying data-node="<id>" inside
 *  `container`, measured after layout and again whenever anything resizes. */
export function useArrows(container: React.RefObject<HTMLElement | null>, edges: Edge[], deps: unknown[]): Drawn[] {
  const [drawn, setDrawn] = useState<Drawn[]>([]);
  const key = JSON.stringify(edges);

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    /* A timer, not requestAnimationFrame: rAF never fires in a hidden tab,
       which would leave the chart without arrows until it is shown. */
    let frame: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      clearTimeout(frame);
      frame = setTimeout(() => {
        const box = root.getBoundingClientRect();
        const find = (id: string) => root.querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`);
        const out: Drawn[] = [];
        for (const e of edges) {
          const a = find(e.from);
          const b = find(e.to);
          if (!a || !b) continue;
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          const scrollX = root.scrollLeft;
          const scrollY = root.scrollTop;
          let x1, y1, x2, y2, d;
          const side = e.kind === "side" || (e.kind === undefined && Math.abs(ra.top - rb.top) < 4);
          if (side) {
            const leftToRight = ra.left < rb.left;
            x1 = (leftToRight ? ra.right : ra.left) - box.left + scrollX;
            y1 = ra.top + ra.height / 2 - box.top + scrollY;
            x2 = (leftToRight ? rb.left : rb.right) - box.left + scrollX;
            y2 = rb.top + rb.height / 2 - box.top + scrollY;
            const dx = (x2 - x1) / 2;
            d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
          } else {
            x1 = ra.left + ra.width / 2 - box.left + scrollX;
            y1 = ra.bottom - box.top + scrollY;
            x2 = rb.left + rb.width / 2 - box.left + scrollX;
            y2 = rb.top - box.top + scrollY;
            const dy = Math.max(12, (y2 - y1) / 2);
            d = `M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`;
          }
          /* Side labels sit mid-curve so neighbouring arrows don't stack them
             at a shared start; "yes" below a diamond sits just under it. */
          out.push({ ...e, kind: side ? "side" : "down", d, lx: side ? (x1 + x2) / 2 : x1 + 6, ly: side ? (y1 + y2) / 2 - 5 : y1 + 14 });
        }
        setDrawn(out);
      }, 16);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    root.querySelectorAll("[data-node]").forEach((n) => ro.observe(n));
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(frame);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);

  return drawn;
}

export function ArrowLayer({ drawn, id }: { drawn: Drawn[]; id: string }) {
  const colors = [...new Set(drawn.map((d) => d.color ?? "var(--line-control)"))];
  /* Lines sit under the boxes; labels get their own layer on top, so a box
     never hides what an arrow says. */
  return (
    <>
      <svg className="lp-flow-svg" aria-hidden="true">
        <defs>
          {colors.map((c, i) => (
            <marker key={c} id={`${id}-m${i}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={c} />
            </marker>
          ))}
        </defs>
        {drawn.map((d, i) => {
          const c = d.color ?? "var(--line-control)";
          return (
            <path
              key={i}
              d={d.d}
              opacity={d.opacity ?? 1}
              fill="none"
              stroke={c}
              strokeWidth={d.width ?? 1.5}
              strokeDasharray={d.dashed ? "5 4" : undefined}
              markerEnd={`url(#${id}-m${colors.indexOf(c)})`}
            />
          );
        })}
      </svg>
      <svg className="lp-flow-svg lp-labels" aria-hidden="true">
        {drawn.map((d, i) =>
          d.label ? (
            <text
              key={i}
              x={d.lx}
              y={d.ly}
              opacity={d.opacity ?? 1}
              textAnchor={d.kind === "side" ? "middle" : "start"}
              fontSize="11"
              fontWeight="600"
              fill={d.labelColor ?? d.color ?? "var(--line-control)"}
              style={{ paintOrder: "stroke" }}
              stroke="var(--bg)"
              strokeWidth="3"
            >
              {d.label}
            </text>
          ) : null,
        )}
      </svg>
    </>
  );
}
