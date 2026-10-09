"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { Model } from "../../lib/system/model";
import { CloseButton, Modal, RowsGrid, useTable, type Link } from "./ui";

/* The Tables popup: every table in the site database on one canvas, one
   column per data group, linked tables pulled level with each other, each
   card showing its newest rows once it scrolls into view. */

type Graph = { store: string; tables: { name: string; store: string; columns: number; pk: string[]; rows: boolean }[]; links: Link[] };

const CARD_W = 300;
const NAME_Y = 17;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.2;
const PASSES = 6;

export function TablesModal({ model, onClose }: { model: Model; onClose: () => void }) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [hot, setHot] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [lines, setLines] = useState<{ key: string; d: string; link: Link; lx: number; ly: number }[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let live = true;
    fetch("/api/system/graph", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!live) return;
        if (!res.ok) setError(body?.error ?? `Couldn’t read the tables (${res.status}).`);
        else setGraph(body as Graph);
      })
      .catch(() => live && setError("Couldn’t reach the server."));
    return () => {
      live = false;
    };
  }, []);

  /* Columns: each data part in order, then tables in no part. */
  const columns = useMemo(() => {
    if (!graph) return [];
    const names = new Set(graph.tables.map((t) => t.name));
    const placed = new Set<string>();
    const cols: { id: string; title: string; other: boolean; tables: string[] }[] = [];
    for (const area of model.areas.filter((a) => a.lane === "data")) {
      const tables = model.tables.filter((t) => t.areas.includes(area.id) && names.has(t.name)).map((t) => t.name);
      if (!tables.length) continue;
      tables.forEach((t) => placed.add(t));
      cols.push({ id: area.id, title: area.name, other: false, tables });
    }
    const rest = graph.tables.map((t) => t.name).filter((n) => !placed.has(n));
    if (rest.length) cols.push({ id: "other", title: "Other tables", other: true, tables: rest });

    /* Most-linked first, then barycenter passes: each table moves toward the
       average row of its neighbours in other columns. */
    const degree = (n: string) => graph.links.filter((l) => l.from === n || l.to === n).length;
    cols.forEach((c) => c.tables.sort((a, b) => degree(b) - degree(a) || a.localeCompare(b)));
    const colOf = new Map<string, number>();
    cols.forEach((c, i) => c.tables.forEach((t) => colOf.set(t, i)));
    for (let pass = 0; pass < PASSES; pass++) {
      const row = new Map<string, number>();
      cols.forEach((c) => c.tables.forEach((t, i) => row.set(t, i)));
      for (const c of cols) {
        const score = new Map<string, number>();
        for (const t of c.tables) {
          const ys = graph.links
            .filter((l) => (l.from === t || l.to === t) && l.from !== l.to)
            .map((l) => (l.from === t ? l.to : l.from))
            .filter((o) => colOf.get(o) !== colOf.get(t) && row.has(o))
            .map((o) => row.get(o)!);
          score.set(t, ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : row.get(t)!);
        }
        c.tables.sort((a, b) => score.get(a)! - score.get(b)! || row.get(a)! - row.get(b)!);
      }
    }
    return cols;
  }, [graph, model]);

  const linkCount = useCallback((n: string) => graph?.links.filter((l) => l.from === n || l.to === n).length ?? 0, [graph]);

  /* Lines in unscaled canvas coordinates. offsetLeft/offsetTop are layout
     values, so the CSS scale on the canvas never skews them. */
  const measure = useCallback(() => {
    const root = canvas.current;
    if (!root || !graph) return;
    setSize({ w: root.offsetWidth, h: root.offsetHeight });
    const pos = new Map<string, { x: number; y: number; col: number; row: number }>();
    columns.forEach((c, ci) =>
      c.tables.forEach((t, ri) => {
        const el = root.querySelector<HTMLElement>(`[data-table="${CSS.escape(t)}"]`);
        if (!el) return;
        let x = 0;
        let y = 0;
        let n: HTMLElement | null = el;
        while (n && n !== root) {
          x += n.offsetLeft;
          y += n.offsetTop;
          n = n.offsetParent as HTMLElement | null;
        }
        pos.set(t, { x, y: y + NAME_Y, col: ci, row: ri });
      }),
    );
    const out: typeof lines = [];
    graph.links.forEach((link, i) => {
      const a = pos.get(link.from);
      const b = pos.get(link.to);
      if (!a || !b || link.from === link.to) return;
      let d: string;
      let lx: number;
      let ly: number;
      if (a.col === b.col) {
        const w = 28 + 14 * Math.abs(a.row - b.row);
        const x = a.x + CARD_W;
        d = `M${x},${a.y} C${x + w},${a.y} ${x + w},${b.y} ${x},${b.y}`;
        lx = x + w * 0.75 + 4;
        ly = (a.y + b.y) / 2;
      } else {
        const right = a.col < b.col;
        const x1 = right ? a.x + CARD_W : a.x;
        const x2 = right ? b.x : b.x + CARD_W;
        const dx = (x2 - x1) / 2;
        d = `M${x1},${a.y} C${x1 + dx},${a.y} ${x2 - dx},${b.y} ${x2},${b.y}`;
        lx = (x1 + x2) / 2;
        ly = (a.y + b.y) / 2 - 6;
      }
      out.push({ key: `${i}`, d, link, lx, ly });
    });
    setLines(out);
  }, [columns, graph]);

  useLayoutEffect(() => {
    measure();
    const root = canvas.current;
    if (!root) return;
    /* Rows arrive later and change card heights, so lines follow them. */
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    root.querySelectorAll("[data-table]").forEach((n) => ro.observe(n));
    return () => ro.disconnect();
  }, [measure]);

  const fit = () => {
    const vp = viewport.current;
    if (!vp || !size.w) return;
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (vp.clientWidth - 8) / size.w)));
  };
  const step = (d: number) => setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round((z + d) * 100) / 100)));

  const focus = pinned ?? hot;
  const neighbours = useMemo(() => {
    const s = new Set<string>();
    if (focus && graph) for (const l of graph.links) {
      if (l.from === focus) s.add(l.to);
      if (l.to === focus) s.add(l.from);
    }
    return s;
  }, [focus, graph]);

  return (
    <Modal label="Tables" onClose={onClose} full>
      <div className="lp-mhead">
        <div>
          <span className="lp-eyebrow">Tables</span>
          <div className="lp-mtitle">
            <h2>Everything {model.appName} writes down</h2>
            <span className="lp-muted">Hover or click a table to follow its links.</span>
          </div>
        </div>
        <div className="lp-cluster">
          <CloseButton onClose={onClose} />
        </div>
      </div>
      <div className="lp-toolbar">
        <span>
          <i className="lp-solid" />
          declared
        </span>
        <span>
          <i className="lp-dashed" />
          inferred from column names
        </span>
        <span>Newest 3 rows per table · times in {model.timeZone}</span>
        <div className="lp-zoomctl" role="group" aria-label="Zoom">
          <button type="button" onClick={() => step(-0.1)} aria-label="Zoom out" disabled={zoom <= MIN_ZOOM}>
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => step(0.1)} aria-label="Zoom in" disabled={zoom >= MAX_ZOOM}>
            +
          </button>
          <button type="button" className="lp-fit" onClick={fit}>
            Fit
          </button>
        </div>
      </div>
      <div className="lp-viewport" ref={viewport} onClick={(e) => e.target === e.currentTarget && setPinned(null)}>
        {error && <div className="lp-state" style={{ margin: 24 }}>{error}</div>}
        {!graph && !error && <div className="lp-state" style={{ margin: 24 }}>Reading the database…</div>}
        {graph && (
          <div className="lp-scaler" style={{ width: size.w * zoom, height: size.h * zoom }}>
            <div className="lp-canvas" ref={canvas} style={{ transform: `scale(${zoom})` }}>
              <svg className="lp-flow-svg" width={size.w} height={size.h} aria-hidden="true" style={{ zIndex: 0 }}>
                {lines.map(({ key, d, link, lx, ly }) => {
                  const on = focus && (link.from === focus || link.to === focus);
                  return (
                    <g key={key} opacity={focus && !on ? 0.12 : 1}>
                      <path
                        d={d}
                        fill="none"
                        stroke={on ? "var(--accent)" : "var(--line-control)"}
                        strokeOpacity={on ? 1 : 0.55}
                        strokeWidth={on ? 2.2 : 1.2}
                        strokeDasharray={link.declared ? undefined : "6 5"}
                      />
                      {on && (
                        <text x={lx} y={ly} fontSize="11" fontWeight="600" fill="var(--ink)" textAnchor="middle" stroke="var(--bg)" strokeWidth="4" style={{ paintOrder: "stroke" }}>
                          {link.fromColumn} → {link.toColumn}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
              {columns.map((c) => (
                <div key={c.id} className="lp-ccol">
                  <h4>{c.title}</h4>
                  {c.tables.map((t) => (
                    <TableCard
                      key={t}
                      name={t}
                      store={graph.tables.find((x) => x.name === t)?.store ?? graph.store}
                      readable={graph.tables.find((x) => x.name === t)?.rows ?? false}
                      other={c.other}
                      links={linkCount(t)}
                      viewport={viewport}
                      timeZone={model.timeZone}
                      state={!focus ? "" : focus === t ? "lp-hot" : neighbours.has(t) ? "lp-linked" : "lp-fade"}
                      onHover={(on) => setHot(on ? t : null)}
                      onPick={() => setPinned((p) => (p === t ? null : t))}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function TableCard({
  name,
  store,
  readable,
  other,
  links,
  viewport,
  timeZone,
  state,
  onHover,
  onPick,
}: {
  name: string;
  store: string;
  readable: boolean;
  other: boolean;
  links: number;
  viewport: React.RefObject<HTMLDivElement | null>;
  timeZone: string;
  state: string;
  onHover: (on: boolean) => void;
  onPick: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  /* Fetch rows only when the card nears the visible part of the canvas. */
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { root: viewport.current, rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, viewport]);

  /* Only the site database's rows are reachable; the others show structure. */
  const { data, error, loading } = useTable(store, name, seen && readable);

  return (
    <div
      ref={ref}
      data-table={name}
      className={`lp-ccard lp-store-${store}${other ? " lp-ccard-other" : ""} ${state}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onPick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
      aria-label={`${name}, ${links} links`}
    >
      <div className="lp-ccard-head">
        {name}
        <span>{links === 1 ? "1 link" : `${links} links`}</span>
      </div>
      {!readable ? (
        <div className="lp-state">Rows stay on the Embarko server.</div>
      ) : data ? (
        <RowsGrid data={data} timeZone={timeZone} />
      ) : (
        <div className="lp-state">{error ?? (loading ? "Reading…" : "Scroll here to read its rows.")}</div>
      )}
    </div>
  );
}
