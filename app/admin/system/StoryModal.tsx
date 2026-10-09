"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { Version } from "../../lib/system/history";
import type { JourneyView, Model, StepView } from "../../lib/system/model";
import { FlowChart } from "./FlowChart";
import { LaneMap } from "./MapView";
import { StoryTables } from "./TableViews";
import { ACTOR_COLOR, ACTOR_LABEL, CloseButton, Modal, color, plural, shortDate } from "./ui";

export type Tab = "why" | "flow" | "map" | "tables";

const repoName = (model: Model, id: string) => model.repos.find((r) => r.id === id)?.name ?? id;

const TAB_INFO: { id: Tab; name: string; question: string }[] = [
  { id: "why", name: "Why", question: "Who is it for, and what changes for them?" },
  { id: "flow", name: "Flow", question: "What happens, step by step — and what can go wrong?" },
  { id: "map", name: "System map", question: "Which parts do the work, and what passes between them?" },
  { id: "tables", name: "Tables", question: "What gets written down, and how it links up." },
];

type Change = Partial<{ story: string; tab: Tab; step: string | null; version: string | null }>;

export function StoryModal({
  model,
  storyId,
  tab,
  step,
  version,
  onChange,
  onClose,
}: {
  model: Model;
  storyId: string;
  tab: Tab;
  step: string | null;
  version: string | null;
  onChange: (c: Change) => void;
  onClose: () => void;
}) {
  const index = model.journeys.findIndex((j) => j.id === storyId);
  const j = model.journeys[index];
  const versions = model.versions[storyId] ?? [];
  const v = versions.find((x) => x.short === version) ?? null;
  const stepIndex = step ? j.steps.findIndex((s) => s.id === step) : -1;
  const chosen = stepIndex >= 0 ? j.steps[stepIndex] : null;

  /* Keys: 1–4 tabs, ←/→ steps, Esc closes. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "Escape") onClose();
      else if (/^[1-4]$/.test(e.key)) onChange({ tab: TAB_INFO[Number(e.key) - 1].id });
      else if (e.key === "ArrowRight") {
        e.preventDefault();
        onChange({ step: j.steps[Math.min(j.steps.length - 1, stepIndex + 1)].id });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onChange({ step: stepIndex <= 0 ? null : j.steps[stepIndex - 1].id });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [j, stepIndex, onChange, onClose]);

  const goStory = (d: number) => {
    const next = model.journeys[index + d];
    if (next) onChange({ story: next.id, step: null, version: null });
  };

  /* Each tab starts at its top, and so does each story. */
  const body = useRef<HTMLDivElement>(null);
  /* A layout effect, so a step the Flow tab scrolls to afterwards still wins. */
  useLayoutEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [tab, storyId]);

  const changed = useMemo(() => new Map((v?.stepsChanged ?? []).map((s) => [s.step, s])), [v]);
  const unbuilt = useMemo(() => new Set(v?.notBuilt ?? []), [v]);

  return (
    <Modal label={`User story: ${j.short}`} onClose={onClose}>
      <div className="lp-mhead">
        <div>
          <span className="lp-eyebrow">User story</span>
          <div className="lp-mtitle">
            <h2>{j.short}</h2>
            <span className="lp-muted">{j.name}</span>
          </div>
          <div className="lp-who">
            <b>{j.who}</b> wants to {j.goal}.
          </div>
        </div>
        <div className="lp-cluster">
          <VersionPicker versions={versions} chosen={version} timeZone={model.timeZone} onPick={(x) => onChange({ version: x })} />
          <span className="lp-divider" aria-hidden="true" />
          <button type="button" className="lp-icon" onClick={() => goStory(-1)} disabled={index === 0} aria-label="Previous story">
            ←
          </button>
          <button type="button" className="lp-icon" onClick={() => goStory(1)} disabled={index === model.journeys.length - 1} aria-label="Next story">
            →
          </button>
          <CloseButton onClose={onClose} />
        </div>
      </div>

      {v && (
        <div className="lp-vbar" role="status">
          <span>
            <b>Viewing v{v.n}</b> · {shortDate(v.date, model.timeZone)} · {repoName(model, v.repo)} — {v.subject} <span className="lp-muted">by {v.author}</span>
          </span>
          <span className="lp-muted">
            {v.stepsChanged.length} of {j.steps.length} steps changed · {v.notBuilt.length} not built yet · {plural(v.files.length, "file")}
          </span>
          {v.url && (
            <a className="lp-link" href={v.url} target="_blank" rel="noreferrer">
              See the commit ↗
            </a>
          )}
          <button type="button" className="lp-vbar-close" onClick={() => onChange({ version: null })}>
            Back to now ✕
          </button>
        </div>
      )}

      <div className="lp-stepbar" role="toolbar" aria-label="Steps">
        <button type="button" className="lp-schip lp-schip-whole" aria-pressed={!chosen} onClick={() => onChange({ step: null })}>
          Whole story
        </button>
        {j.steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`lp-schip${changed.has(s.id) ? " lp-is-changed" : ""}${unbuilt.has(s.id) ? " lp-is-unbuilt" : ""}`}
            style={color(ACTOR_COLOR[s.actor])}
            aria-pressed={chosen?.id === s.id}
            onClick={() => onChange({ step: chosen?.id === s.id ? null : s.id })}
            title={`${ACTOR_LABEL[s.actor]} — ${s.plain}`}
          >
            <span className="lp-num">{i + 1}</span>
            {s.title}
          </button>
        ))}
      </div>

      <div className="lp-tabs" role="tablist">
        {TAB_INFO.map((t, i) => (
          <button key={t.id} type="button" role="tab" className="lp-tab" aria-selected={tab === t.id} onClick={() => onChange({ tab: t.id })}>
            {t.name} <kbd>{i + 1}</kbd>
          </button>
        ))}
      </div>

      <div className="lp-mbody" role="tabpanel" ref={body}>
        <p className="lp-caption">{TAB_INFO.find((t) => t.id === tab)?.question}</p>
        {tab === "why" && <WhyTab model={model} j={j} step={chosen} v={v} onStep={(s) => onChange({ step: s })} />}
        {tab === "flow" && <FlowChart model={model} j={j} step={chosen} v={v} onStep={(s) => onChange({ step: s })} />}
        {tab === "map" && <StoryMap model={model} j={j} step={chosen} v={v} />}
        {tab === "tables" && <StoryTables model={model} j={j} step={chosen} v={v} />}
      </div>
    </Modal>
  );
}

function VersionPicker({
  versions,
  chosen,
  timeZone,
  onPick,
}: {
  versions: Version[];
  chosen: string | null;
  timeZone: string;
  onPick: (short: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  if (versions.length === 0) return <span className="lp-cluster-label">No history for this story yet</span>;
  const newest = versions.slice(0, 2);
  const older = versions.slice(2);
  const chosenOlder = older.find((x) => x.short === chosen);
  /* Picking the chosen chip again goes back to now. */
  const pick = (short: string) => onPick(chosen === short ? null : short);

  return (
    <>
      <span className="lp-cluster-label">Version</span>
      <button type="button" className="lp-vchip" aria-pressed={!chosen} onClick={() => onPick(null)}>
        Now
      </button>
      {newest.map((x) => (
        <button key={x.short} type="button" className="lp-vchip" aria-pressed={chosen === x.short} onClick={() => pick(x.short)} title={x.subject}>
          v{x.n} · {shortDate(x.date, timeZone)}
        </button>
      ))}
      {older.length > 0 && (
        <div className="lp-drop" ref={ref}>
          <button type="button" className="lp-vchip" aria-pressed={!!chosenOlder} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {chosenOlder ? `v${chosenOlder.n} · ${shortDate(chosenOlder.date, timeZone)}` : `+${older.length}`} ▾
          </button>
          {open && (
            <div className="lp-drop-menu" role="menu">
              {older.map((x) => (
                <button
                  key={x.short}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    pick(x.short);
                    setOpen(false);
                  }}
                >
                  <b>v{x.n}</b>
                  <span className="lp-faint">{shortDate(x.date, timeZone)}</span>
                  <span title={x.subject}>
                    {x.repo !== "web" && <span className="lp-repo-tag">{x.repo}</span>}
                    {x.subject}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* --- Why ------------------------------------------------------------------ */

function StepLink({ j, s, onStep }: { j: JourneyView; s: StepView; onStep: (id: string) => void }) {
  return (
    <button type="button" className="lp-steplink" onClick={() => onStep(s.id)}>
      {j.steps.indexOf(s) + 1}. {s.title}
    </button>
  );
}

function WhyTab({
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
  onStep: (id: string) => void;
}) {
  const steps = step ? [step] : j.steps;
  const byActor = (["user", "ai", "rule", "system", "outside"] as const)
    .map((a) => ({ a, n: steps.filter((s) => s.actor === a).length }))
    .filter((x) => x.n > 0);
  const areaIds = new Set(steps.flatMap((s) => s.areas));
  const screens = model.areas.filter((a) => a.lane === "screens" && areaIds.has(a.id));
  const outside = model.areas.filter((a) => a.lane === "outside" && areaIds.has(a.id));
  const choices = steps.filter((s) => s.choices.length);
  const fails = steps.filter((s) => s.failure.length);
  const stepById = new Map(j.steps.map((s) => [s.id, s]));

  return (
    <>
      {step ? (
        <div className="lp-focus" style={color(ACTOR_COLOR[step.actor])}>
          <span className="lp-eyebrow">
            Step {j.steps.indexOf(step) + 1} of {j.steps.length} · {ACTOR_LABEL[step.actor]}
          </span>
          <h3>{step.title}</h3>
          <p>{step.plain}</p>
          <p className="lp-muted">
            It helps the story because without it, {j.who.charAt(0).toLowerCase() + j.who.slice(1)} can&rsquo;t {j.goal}.
          </p>
        </div>
      ) : (
        <div className="lp-promise">
          <div>
            <span className="lp-eyebrow">{j.who} wants to</span>
            <p>{j.goal.charAt(0).toUpperCase() + j.goal.slice(1)}.</p>
          </div>
          <div className="lp-arrow" aria-hidden="true">
            →
          </div>
          <div>
            <span className="lp-eyebrow">When it works</span>
            <p>{j.outcome}</p>
          </div>
        </div>
      )}

      <div className="lp-why-grid">
        {v && (
          <div className="lp-wcard lp-wcard-changed">
            <span className="lp-eyebrow">What changed in v{v.n}</span>
            <p>
              <b>{v.subject}</b>
            </p>
            <p className="lp-muted">
              {shortDate(v.date, model.timeZone)} · {repoName(model, v.repo)} · {v.author}
            </p>
            {v.body && <p className="lp-body-text">{v.body}</p>}
            {v.stepsChanged.length > 0 && (
              <ul style={{ marginTop: 10 }}>
                {v.stepsChanged.map((c) => {
                  const s = stepById.get(c.step);
                  return s ? (
                    <li key={c.step}>
                      <StepLink j={j} s={s} onStep={onStep} /> <span className="lp-add">+{c.add}</span> <span className="lp-del">−{c.del}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            )}
            {v.notBuilt.length > 0 && (
              <p style={{ marginTop: 8 }}>
                Not built yet at this version: {v.notBuilt.map((id) => stepById.get(id)?.title ?? id).join(", ")}
              </p>
            )}
            <ul className="lp-files">
              {v.files.map((f) => (
                <li key={f.path}>
                  {f.path} <span className="lp-add">+{f.add}</span> <span className="lp-del">−{f.del}</span>
                </li>
              ))}
            </ul>
            {v.url && (
              <p style={{ marginTop: 8 }}>
                <a className="lp-link" href={v.url} target="_blank" rel="noreferrer">
                  See the full change ↗
                </a>
              </p>
            )}
          </div>
        )}

        <div className="lp-wcard">
          <span className="lp-eyebrow">Who does the work</span>
          <ul>
            {byActor.map(({ a, n }) => (
              <li key={a}>
                <span className="lp-dot" style={color(ACTOR_COLOR[a])} /> {ACTOR_LABEL[a]} — {plural(n, "step")}
              </li>
            ))}
          </ul>
        </div>

        <div className="lp-wcard">
          <span className="lp-eyebrow">Where it happens</span>
          {screens.length ? (
            <ul>
              {screens.map((a) => (
                <li key={a.id}>
                  <b>{a.name}</b> — <span className="lp-muted">{a.plain}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Behind the scenes.</p>
          )}
          {outside.length > 0 && <p style={{ marginTop: 10 }}>With help from {outside.map((a) => a.name).join(", ")}.</p>}
        </div>

        <div className="lp-wcard">
          <span className="lp-eyebrow">Choices people make</span>
          {choices.length ? (
            <ul>
              {choices.map((s) => (
                <li key={s.id}>
                  <StepLink j={j} s={s} onStep={onStep} /> — {s.choices.join(" · ")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="lp-muted">No choices here — it just happens.</p>
          )}
        </div>

        <div className="lp-wcard lp-wcard-fail">
          <span className="lp-eyebrow">What could go wrong</span>
          {fails.length ? (
            <ul>
              {fails.map((s) => (
                <li key={s.id}>
                  <StepLink j={j} s={s} onStep={onStep} />
                  <ul style={{ marginTop: 4, gap: 4 }}>
                    {s.failure.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nothing written down yet — an open question.</p>
          )}
        </div>
      </div>
    </>
  );
}

/* --- System map (in a story) -------------------------------------------- */

function StoryMap({ model, j, step, v }: { model: Model; j: JourneyView; step: StepView | null; v: Version | null }) {
  const lit = new Set(step ? step.areas : j.areas);
  const soft = new Set(step ? j.areas.filter((a) => !lit.has(a)) : []);
  const changed = new Set(v?.areasChanged ?? []);
  const inStory = (areaId: string) =>
    j.steps
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.areas.includes(areaId))
      .map(({ s, i }) => `${i + 1}. ${s.title}`);
  return <LaneMap model={model} lit={lit} soft={soft} changed={changed} changedLabel={v ? `changed in v${v.n}` : undefined} inStory={inStory} />;
}
