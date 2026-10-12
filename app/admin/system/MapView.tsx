"use client";

import { useEffect, useRef, useState } from "react";

import type { AreaView, Model } from "../../lib/system/model";
import { ArrowLayer, CloseButton, JUDGE_LABEL, LANE_COLOR, Modal, color, useArrows, type Edge } from "./ui";

/* The six lanes with every part in its lane. Used inside a story (lit by the
   story or step) and as the whole-product map popup (lit by a click). */

export function LaneMap({
  model,
  lit,
  soft = new Set(),
  changed = new Set(),
  changedLabel,
  inStory,
  allArrows = false,
  selected: controlled,
  onSelect,
  extra,
}: {
  model: Model;
  lit: Set<string>;
  soft?: Set<string>;
  changed?: Set<string>;
  changedLabel?: string;
  inStory?: (areaId: string) => string[];
  /** Draw every arrow faintly, labelling only those touching `lit`. */
  allArrows?: boolean;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  extra?: (area: AreaView) => React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [own, setOwn] = useState<string | null>(null);
  const selected = controlled !== undefined ? controlled : own;
  const select = (id: string | null) => (onSelect ? onSelect(id) : setOwn(id));
  const areaById = new Map(model.areas.map((a) => [a.id, a]));
  const anyLit = lit.size > 0;

  const edges: Edge[] = model.flows
    .filter((f) => allArrows || (lit.has(f.from) && lit.has(f.to)))
    .map((f) => {
      const hot = lit.has(f.from) && lit.has(f.to);
      const sameLane = areaById.get(f.from)?.lane === areaById.get(f.to)?.lane;
      return {
        from: f.from,
        to: f.to,
        kind: sameLane ? "down" : "side",
        label: hot ? f.label : undefined,
        color: hot ? "var(--ink-soft)" : "var(--line-strong)",
        labelColor: "var(--ink)",
        opacity: hot ? 1 : allArrows && anyLit ? 0.25 : 0.6,
        width: hot ? 1.5 : 1,
      } satisfies Edge;
    });
  const drawn = useArrows(root, edges, [lit.size, soft.size, selected]);

  const card = selected ? areaById.get(selected) : null;

  return (
    <>
      <div className="lp-lanes-scroll">
        <div className="lp-lanes" ref={root}>
          <ArrowLayer drawn={drawn} id="lanes" />
          {model.lanes.map((lane) => (
            <div key={lane.id} className="lp-lane" style={color(LANE_COLOR[lane.id])}>
              <h4>
                {lane.name}
                <span>{lane.plain}</span>
              </h4>
              <div className="lp-lane-items">
                {model.areas
                  .filter((a) => a.lane === lane.id)
                  .map((a) => {
                    const state = lit.has(a.id) ? " lp-lit" : soft.has(a.id) ? " lp-soft" : anyLit ? " lp-fade" : "";
                    return (
                      <button
                        key={a.id}
                        type="button"
                        data-node={a.id}
                        className={`lp-area${state}${changed.has(a.id) ? " lp-is-changed" : ""}`}
                        style={color(LANE_COLOR[a.lane])}
                        aria-pressed={selected === a.id}
                        onClick={() => select(selected === a.id ? null : a.id)}
                      >
                        <b>{a.name}</b>
                        {allArrows && <small>{a.plain}</small>}
                        {allArrows && a.judge && <span className="lp-area-judge">{JUDGE_LABEL[a.judge]}</span>}
                        {changed.has(a.id) && changedLabel && <span className="lp-tag lp-tag-changed">{changedLabel}</span>}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {card && (
        <div className="lp-map-card" style={color(LANE_COLOR[card.lane])}>
          <span className="lp-eyebrow">
            {model.lanes.find((l) => l.id === card.lane)?.name}
            {card.judge ? ` · ${JUDGE_LABEL[card.judge]}` : ""}
          </span>
          <h3>{card.name}</h3>
          <p>{card.plain}</p>
          {card.detail && <p className="lp-muted">{card.detail}</p>}
          <dl>
            {inStory && (
              <>
                <dt>In this story</dt>
                <dd>{inStory(card.id).join(" · ") || "Not used by this story"}</dd>
              </>
            )}
            <dt>Talks to</dt>
            <dd>
              {[
                ...model.flows.filter((f) => f.from === card.id).map((f) => `→ ${areaById.get(f.to)?.name ?? f.to} (${f.label})`),
                ...model.flows.filter((f) => f.to === card.id).map((f) => `← ${areaById.get(f.from)?.name ?? f.from} (${f.label})`),
              ].join(" · ") || "Nothing directly"}
            </dd>
            {extra?.(card)}
          </dl>
        </div>
      )}
    </>
  );
}

/* --- the whole-product map popup ---------------------------------------- */

export function MapModal({ model, onClose, onOpenStory }: { model: Model; onClose: () => void; onOpenStory: (id: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* A clicked part lights up with its neighbours. */
  const lit = new Set<string>();
  if (selected) {
    lit.add(selected);
    for (const f of model.flows) {
      if (f.from === selected) lit.add(f.to);
      if (f.to === selected) lit.add(f.from);
    }
  }
  const stories = (areaId: string) => model.journeys.filter((j) => j.areas.includes(areaId));

  return (
    <Modal label="System map" onClose={onClose}>
      <div className="lp-mhead">
        <div>
          <span className="lp-eyebrow">System map</span>
          <div className="lp-mtitle">
            <h2>Every part of {model.appName}</h2>
            <span className="lp-muted">Click a part to see what it talks to.</span>
          </div>
        </div>
        <div className="lp-cluster">
          {selected && (
            <button type="button" className="lp-vchip" onClick={() => setSelected(null)}>
              Clear
            </button>
          )}
          <CloseButton onClose={onClose} />
        </div>
      </div>
      <div className="lp-mbody">
        <LaneMap
          model={model}
          lit={lit}
          allArrows
          selected={selected}
          onSelect={setSelected}
          extra={(a) => (
            <>
              <dt>Stories that use it</dt>
              <dd>
                {stories(a.id).length
                  ? stories(a.id).map((j, i) => (
                      <span key={j.id}>
                        {i > 0 && " · "}
                        <button type="button" className="lp-link" onClick={() => onOpenStory(j.id)}>
                          {j.short}
                        </button>
                      </span>
                    ))
                  : "None yet"}
              </dd>
              {a.files.length > 0 && (
                <>
                  <dt>Code</dt>
                  <dd className="lp-mono">{a.files.length > 8 ? `${a.files.slice(0, 8).join(", ")} +${a.files.length - 8} more` : a.files.join(", ")}</dd>
                </>
              )}
            </>
          )}
        />
      </div>
    </Modal>
  );
}
