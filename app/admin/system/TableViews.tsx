"use client";

import { useEffect, useRef, useState } from "react";

import type { Version } from "../../lib/system/history";
import type { JourneyView, Model, StepView, TableView } from "../../lib/system/model";
import { ArrowLayer, RowsGrid, useArrows, useTable, type Edge, type Link, type TableData } from "./ui";

/* The Tables tab of a story: what it keeps and looks up on the left, the
   chosen table on the right — its newest rows, how it links, its columns. */

type Sub = "rows" | "links" | "columns";

export function StoryTables({ model, j, step, v }: { model: Model; j: JourneyView; step: StepView | null; v: Version | null }) {
  const kept = step ? step.kept : j.kept;
  const lookedUp = step ? step.lookedUp : j.lookedUp;
  const byId = new Map(model.tables.map((t) => [t.id, t]));
  const changed = new Set(v?.tablesChanged ?? []);
  const [chosen, setChosen] = useState<string | null>(null);
  const [sub, setSub] = useState<Sub>("rows");

  /* Default to the first kept table; follow the step as it changes. */
  const all = [...kept, ...lookedUp];
  const current = chosen && (all.includes(chosen) || byId.has(chosen)) ? chosen : (all[0] ?? null);
  useEffect(() => setChosen(null), [step?.id]);

  const where = (id: string) =>
    j.steps
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.kept.includes(id) || s.lookedUp.includes(id))
      .map(({ s, i }) => `${i + 1}. ${s.title}`);

  const chip = (id: string) => {
    const t = byId.get(id);
    if (!t) return null;
    return (
      <button
        key={id}
        type="button"
        className={`lp-chip lp-chip-btn lp-tchip lp-store-${t.store}${changed.has(t.name) ? " lp-is-changed" : ""}`}
        aria-pressed={current === id}
        onClick={() => setChosen(id)}
        title={t.note ?? undefined}
      >
        {t.name}
      </button>
    );
  };

  if (all.length === 0 && !chosen) {
    return (
      <div className="lp-state">
        {step ? "This step" : "This story"} keeps and looks up no tables. Open <b>Tables</b> in the page header to see every table there is.
      </div>
    );
  }

  const table = current ? byId.get(current) : undefined;
  return (
    <div className="lp-tables">
      <div className="lp-tables-side">
        <h4>Kept by this {step ? "step" : "story"}</h4>
        <div className="lp-chips">{kept.length ? kept.map(chip) : <span className="lp-faint">Nothing written</span>}</div>
        <h4>Looked up</h4>
        <div className="lp-chips">{lookedUp.length ? lookedUp.map(chip) : <span className="lp-faint">Nothing read</span>}</div>
        {v && v.tablesChanged.length > 0 && <p className="lp-note">Ringed: changed by a migration in v{v.n}.</p>}
      </div>
      {table && (
        <TableDetail
          model={model}
          table={table}
          usedAt={where(table.id)}
          sub={sub}
          onSub={setSub}
          onOpen={(name) => {
            const t = model.tables.find((x) => x.name === name);
            if (t) setChosen(t.id);
          }}
        />
      )}
    </div>
  );
}

export function TableDetail({
  model,
  table,
  usedAt,
  sub,
  onSub,
  onOpen,
}: {
  model: Model;
  table: TableView;
  usedAt: string[];
  sub: Sub;
  onSub: (s: Sub) => void;
  onOpen: (name: string) => void;
}) {
  const { data, error, loading } = useTable(table.store, table.name);
  return (
    <div className="lp-tdetail">
      <div className="lp-tdetail-head">
        <h3>{table.name}</h3>
        <span className="lp-faint">
          {table.storeLabel}
          {table.external ? " · read-only" : ""}
        </span>
      </div>
      {table.note && <p className="lp-muted">{table.note}</p>}
      <p className="lp-note">Used at: {usedAt.length ? usedAt.join(" · ") : "no step of this story"}</p>
      <div className="lp-subtabs" role="tablist">
        {(
          [
            ["rows", "Latest rows"],
            ["links", "How it links"],
            ["columns", "Columns"],
          ] as const
        ).map(([id, name]) => (
          <button key={id} type="button" role="tab" className="lp-subtab" aria-selected={sub === id} onClick={() => onSub(id)}>
            {name}
          </button>
        ))}
      </div>
      {loading && <div className="lp-state">Reading the table…</div>}
      {error && <div className="lp-state">{error}</div>}
      {data && sub === "rows" && (
        <>
          <RowsGrid data={data} timeZone={model.timeZone} />
          {table.rows && <p className="lp-note">Real rows, read just now · newest 3 · times in {model.timeZone} · secrets show as ••••</p>}
        </>
      )}
      {data && sub === "links" && <Erd data={data} onOpen={onOpen} />}
      {data && sub === "columns" && (
        <table className="lp-cols">
          <tbody>
            {data.columns.map((c) => (
              <tr key={c.name}>
                <td>{c.name}</td>
                <td className="lp-muted">{c.type}</td>
                <td>
                  {c.key && <span className="lp-ktag lp-ktag-key">key</span>}
                  {c.secret && <span className="lp-ktag lp-ktag-hidden">hidden</span>}
                  {!c.nullable && !c.key && <span className="lp-ktag">required</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const MAX_SIDE = 8;

/* This table in the middle, what points here on the left, what it points at
   on the right. Declared links solid, inferred dashed. */
function Erd({ data, onOpen }: { data: TableData; onOpen: (name: string) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const linkCols = new Set([...data.linksOut.map((l) => l.fromColumn), ...data.linksIn.map((l) => l.toColumn)]);
  const shown = data.columns.filter((c) => c.key || linkCols.has(c.name));
  const more = data.columns.length - shown.length;

  const group = (links: Link[], side: "from" | "to") => {
    const m = new Map<string, Link[]>();
    for (const l of links) m.set(l[side], [...(m.get(l[side]) ?? []), l]);
    return [...m.entries()];
  };
  const inbound = group(data.linksIn, "from");
  const outbound = group(data.linksOut, "to");

  const edges: Edge[] = [
    ...inbound.slice(0, MAX_SIDE).map(([name, ls]) => ({
      from: `in:${name}`,
      to: "center",
      kind: "side" as const,
      dashed: ls.every((l) => !l.declared),
    })),
    ...outbound.slice(0, MAX_SIDE).map(([name, ls]) => ({
      from: "center",
      to: `out:${name}`,
      kind: "side" as const,
      dashed: ls.every((l) => !l.declared),
    })),
  ];
  const drawn = useArrows(root, edges, [data.name]);

  if (inbound.length === 0 && outbound.length === 0) {
    return <div className="lp-state">No links to other tables — declared or inferred from column names.</div>;
  }

  const node = (prefix: string, [name, ls]: [string, Link[]]) => (
    <button key={name} type="button" data-node={`${prefix}:${name}`} className="lp-erd-node" onClick={() => onOpen(name)}>
      {name}
      <small>
        {ls.map((l) => `${l.fromColumn} → ${l.toColumn}`).join(", ")} · {ls.every((l) => !l.declared) ? "inferred" : "declared"}
      </small>
    </button>
  );
  const rest = (list: [string, Link[]][]) =>
    list.length > MAX_SIDE ? <span className="lp-faint">+{list.length - MAX_SIDE}: {list.slice(MAX_SIDE).map(([n]) => n).join(", ")}</span> : null;

  return (
    <>
      <div className="lp-erd" ref={root}>
        <ArrowLayer drawn={drawn} id={`erd-${data.name}`} />
        <div className="lp-erd-col lp-erd-col-left">
          {inbound.length ? inbound.slice(0, MAX_SIDE).map((x) => node("in", x)) : <span className="lp-faint">Nothing points here</span>}
          {rest(inbound)}
        </div>
        <div className="lp-erd-center" data-node="center">
          <h5>{data.name}</h5>
          <ul>
            {shown.map((c) => (
              <li key={c.name}>
                <span>{c.name}</span>
                <span className="lp-faint">{c.key ? "key" : "link"}</span>
              </li>
            ))}
            {more > 0 && <li className="lp-more">+{more} more columns</li>}
          </ul>
        </div>
        <div className="lp-erd-col lp-erd-col-right">
          {outbound.length ? outbound.slice(0, MAX_SIDE).map((x) => node("out", x)) : <span className="lp-faint">Points at nothing</span>}
          {rest(outbound)}
        </div>
      </div>
      <p className="lp-note">
        <span className="lp-solid" />
        declared by the database <span className="lp-dashed" style={{ marginLeft: 12 }} />
        inferred from column names · click a table to open it
      </p>
    </>
  );
}
