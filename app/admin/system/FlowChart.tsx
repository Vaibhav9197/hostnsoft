"use client";

import { Fragment, useEffect, useRef } from "react";

import type { Version } from "../../lib/system/history";
import type { JourneyView, Model, StepView } from "../../lib/system/model";
import { ACTOR_COLOR, ACTOR_LABEL, ArrowLayer, LANE_COLOR, color, useArrows, type Edge } from "./ui";

/* The Flow tab: a real flowchart on a vertical spine. Start pill → step boxes
   → choice diamonds that fan out and rejoin → "Did it work?" diamonds whose
   "no" branches go right to one box per failure → outcome pill. Arrows are
   measured from the DOM after layout and redrawn on resize. */

const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

function splitFailure(text: string) {
  const [c, ...r] = text.split("→");
  return { condition: lowerFirst(c.trim()), result: r.join("→").trim().replace(/\.$/, "") };
}

/* Node ids are "<kind>:<step id>[:<n>]". */
const stepOf = (nodeId: string) => nodeId.split(":")[1] ?? null;

export function FlowChart({
  model,
  j,
  step,
  v,
  onStep,
}: {
  model: Model;
  j: JourneyView;
  step: StepView | null;
  v: Version | null;
  onStep: (id: string | null) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const areaById = new Map(model.areas.map((a) => [a.id, a]));
  const changed = new Map((v?.stepsChanged ?? []).map((s) => [s.step, s]));
  const unbuilt = new Set(v?.notBuilt ?? []);

  /* Edges, built in the same order as the rows below. `open` holds the node
     ids the next node joins onto. */
  const edges: Edge[] = [];
  let open: { id: string; label?: string }[] = [{ id: "start" }];
  const join = (to: string) => {
    for (const o of open) {
      edges.push({ from: o.id, to, kind: "down", label: o.label, labelColor: o.label ? "var(--ok-ink)" : undefined });
    }
  };
  const focus = step?.id ?? null;
  const dimmed = (sid: string) => (focus && focus !== sid ? " lp-dim" : "");

  const rows = j.steps.map((s, i) => {
    const id = `step:${s.id}`;
    join(id);
    open = [{ id }];
    const parts: React.ReactNode[] = [];
    const c = changed.get(s.id);
    parts.push(
      <div className="lp-frow" key={id}>
        <div className="lp-spine">
          <button
            type="button"
            data-node={id}
            className={`lp-fstep${c ? " lp-is-changed" : ""}${unbuilt.has(s.id) ? " lp-is-unbuilt" : ""}${dimmed(s.id)}`}
            style={color(ACTOR_COLOR[s.actor])}
            aria-pressed={focus === s.id}
            onClick={() => onStep(focus === s.id ? null : s.id)}
          >
            <div className="lp-fstep-head">
              <span className="lp-num">{i + 1}</span>
              <span className="lp-dot" style={color(ACTOR_COLOR[s.actor])} />
              {ACTOR_LABEL[s.actor]}
            </div>
            <h4>{s.title}</h4>
            <p>{s.plain}</p>
            {s.areas.length > 0 && (
              <div className="lp-chips">
                {s.areas.map((a) => {
                  const area = areaById.get(a);
                  return area ? (
                    <span key={a} className="lp-chip" style={color(LANE_COLOR[area.lane])}>
                      {area.name}
                    </span>
                  ) : null;
                })}
              </div>
            )}
            {c && v && (
              <span className="lp-tag lp-tag-changed">
                changed in v{v.n} · +{c.add} −{c.del}
              </span>
            )}
            {unbuilt.has(s.id) && v && <span className="lp-tag lp-tag-unbuilt">not built yet at v{v.n}</span>}
          </button>
        </div>
        <div />
      </div>,
    );

    if (s.choices.length) {
      const d = `choose:${s.id}`;
      join(d);
      parts.push(
        <div className="lp-frow" key={d}>
          <div className="lp-spine">
            <div data-node={d} className={`lp-diamond${dimmed(s.id)}`}>
              <span>{s.actor === "user" ? "They choose" : "Which way?"}</span>
            </div>
          </div>
          <div />
        </div>,
      );
      open = s.choices.map((choice, k) => {
        const cid = `choice:${s.id}:${k}`;
        edges.push({ from: d, to: cid, kind: "down" });
        return { id: cid };
      });
      parts.push(
        <div className="lp-frow" key={`${d}:pills`}>
          <div className="lp-spine">
            <div className="lp-choices">
              {s.choices.map((choice, k) => (
                <span key={k} data-node={`choice:${s.id}:${k}`} className={`lp-choice${dimmed(s.id)}`}>
                  {choice}
                </span>
              ))}
            </div>
          </div>
          <div />
        </div>,
      );
    }

    if (s.failure.length) {
      const d = `check:${s.id}`;
      join(d);
      open = [{ id: d, label: "yes" }];
      parts.push(
        <div className="lp-frow" key={d}>
          <div className="lp-spine">
            <div data-node={d} className={`lp-diamond${dimmed(s.id)}`}>
              <span>Did it work?</span>
            </div>
          </div>
          <div className="lp-side">
            {s.failure.map((f, k) => {
              const fid = `fail:${s.id}:${k}`;
              const { condition, result } = splitFailure(f);
              edges.push({
                from: d,
                to: fid,
                kind: "side",
                dashed: true,
                color: "var(--danger)",
                label: k === 0 ? "no" : undefined,
              });
              return (
                <div key={fid} data-node={fid} className={`lp-ffail${dimmed(s.id)}`}>
                  <b>If {condition}</b>
                  <div>→ {result}</div>
                </div>
              );
            })}
          </div>
        </div>,
      );
    }
    return <Fragment key={s.id}>{parts}</Fragment>;
  });
  join("outcome");

  const drawn = useArrows(root, edges, [j.id, focus, v?.short]);

  /* Choosing a step scrolls it into view. */
  useEffect(() => {
    if (!focus) return;
    root.current?.querySelector(`[data-node="step:${CSS.escape(focus)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus]);

  return (
    <>
      <div className="lp-legend" aria-label="Legend">
        <span><i className="lp-lg lp-lg-pill" /> start and end</span>
        <span><i className="lp-lg" /> a step (left edge: who acts)</span>
        <span><i className="lp-lg lp-lg-diamond" /> a decision</span>
        <span><i className="lp-lg lp-lg-choice" /> a choice</span>
        <span><i className="lp-lg lp-lg-fail" /> what happens if it fails</span>
        {(["user", "ai", "rule", "system", "outside"] as const).map((a) => (
          <span key={a}>
            <i className="lp-dot" style={color(ACTOR_COLOR[a])} /> {ACTOR_LABEL[a]}
          </span>
        ))}
      </div>
      <div className="lp-flow" ref={root}>
        <ArrowLayer drawn={drawn.map((d) => (focus && stepOf(d.from) !== focus && stepOf(d.to) !== focus ? { ...d, opacity: 0.3 } : d))} id={`flow-${j.id}`} />
        <div className="lp-frow">
          <div className="lp-spine">
            <div data-node="start" className="lp-fpill">
              {j.who} wants to {j.goal}.
            </div>
          </div>
          <div />
        </div>
        {rows}
        <div className="lp-frow">
          <div className="lp-spine">
            <div data-node="outcome" className="lp-fpill lp-fpill-end">
              {j.outcome}
            </div>
          </div>
          <div />
        </div>
      </div>
    </>
  );
}
