"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { JourneyView, Model } from "../../lib/system/model";
import { MapModal } from "./MapView";
import { StoryModal, type Tab } from "./StoryModal";
import { TablesModal } from "./TablesCanvas";
import { ACTOR_COLOR, color, plural } from "./ui";

/* How Embarko is made — story by story. Cards first, then the PRD on one
   screen; every popup's state lives in the URL hash so a link reopens it. */

type View =
  | { kind: "none" }
  | { kind: "story"; story: string; tab: Tab; step: string | null; version: string | null }
  | { kind: "map" }
  | { kind: "tables" };

const TABS: Tab[] = ["why", "flow", "map", "tables"];

function readHash(model: Model): View {
  const p = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (p.get("view") === "map") return { kind: "map" };
  if (p.get("view") === "tables") return { kind: "tables" };
  const story = model.journeys.find((j) => j.id === p.get("s"));
  if (!story) return { kind: "none" };
  const tab = TABS.includes(p.get("t") as Tab) ? (p.get("t") as Tab) : "why";
  const step = story.steps.some((s) => s.id === p.get("step")) ? p.get("step") : null;
  const version = (model.versions[story.id] ?? []).some((v) => v.short === p.get("v")) ? p.get("v") : null;
  return { kind: "story", story: story.id, tab, step, version };
}

function writeHash(view: View) {
  const p = new URLSearchParams();
  if (view.kind === "map" || view.kind === "tables") p.set("view", view.kind);
  if (view.kind === "story") {
    p.set("s", view.story);
    p.set("t", view.tab);
    if (view.step) p.set("step", view.step);
    if (view.version) p.set("v", view.version);
  }
  const hash = p.toString();
  const url = `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ""}`;
  if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(null, "", url);
  }
}

export function SystemPage({ model }: { model: Model }) {
  const [view, setView] = useState<View>({ kind: "none" });
  /* The hash is read once before anything writes it — otherwise the first
     write would wipe an incoming link. */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setView(readHash(model));
    setReady(true);
    const onHash = () => setView(readHash(model));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [model]);

  useEffect(() => {
    if (ready) writeHash(view);
  }, [view, ready]);

  const openStory = useCallback((story: string, tab: Tab = "why", step: string | null = null) => {
    setView({ kind: "story", story, tab, step, version: null });
  }, []);
  const close = useCallback(() => setView({ kind: "none" }), []);

  return (
    <div className="lp-page">
      <div className="lp-wrap">
        <header className="lp-head">
          <div>
            <h1>How {model.appName} is made — story by story</h1>
            <p>Each card is one thing a person does with {model.appName}. Zoom in to see why it matters, what happens, which parts do the work and what gets written down.</p>
          </div>
          <div className="lp-head-actions">
            <button type="button" className="lp-btn" onClick={() => setView({ kind: "map" })}>
              System map
            </button>
            <button type="button" className="lp-btn" onClick={() => setView({ kind: "tables" })}>
              Tables
            </button>
          </div>
        </header>

        <div className="lp-cards">
          {model.journeys.map((j, i) => (
            <StoryCard key={j.id} j={j} n={i + 1} onZoom={() => openStory(j.id)} />
          ))}
        </div>

        <Prd model={model} onOpen={openStory} />
      </div>

      {view.kind === "story" && (
        <StoryModal
          model={model}
          storyId={view.story}
          tab={view.tab}
          step={view.step}
          version={view.version}
          onChange={(next) => setView({ kind: "story", story: view.story, tab: view.tab, step: view.step, version: view.version, ...next })}
          onClose={close}
        />
      )}
      {view.kind === "map" && <MapModal model={model} onClose={close} onOpenStory={(id) => openStory(id, "map")} />}
      {view.kind === "tables" && <TablesModal model={model} onClose={close} />}
    </div>
  );
}

function StoryCard({ j, n, onZoom }: { j: JourneyView; n: number; onZoom: () => void }) {
  const ai = j.steps.filter((s) => s.actor === "ai").length;
  const fails = j.steps.filter((s) => s.failure.length > 0).length;
  return (
    <article className="lp-card">
      <div className="lp-card-top">
        <span className="lp-eyebrow">Story {n}</span>
        <button type="button" className="lp-zoom" onClick={onZoom} aria-label={`Zoom into ${j.short}`}>
          Zoom ⤢
        </button>
      </div>
      <div>
        <h3>{j.short}</h3>
        <div className="lp-card-name">{j.name}</div>
      </div>
      <div className="lp-who">
        <b>{j.who}</b> wants to {j.goal}.
      </div>
      <div className="lp-chips">
        {j.steps.map((s, i) => (
          <span key={s.id} className="lp-chip" style={color(ACTOR_COLOR[s.actor])} title={s.plain}>
            {i + 1}. {s.title}
          </span>
        ))}
      </div>
      <div className="lp-ends">
        <span className="lp-eyebrow">Ends with</span>
        {j.outcome}
      </div>
      <div className="lp-card-facts">
        {plural(j.steps.length, "step")} · {ai} by AI · {fails} can go wrong
        {j.screens.length > 0 && <> · on {j.screens.slice(0, 3).join(", ")}{j.screens.length > 3 ? ` +${j.screens.length - 3}` : ""}</>}
      </div>
    </article>
  );
}

function Prd({ model, onOpen }: { model: Model; onOpen: (story: string, tab?: Tab, step?: string | null) => void }) {
  const p = model.prd;
  const stepTitle = useMemo(() => {
    const m = new Map<string, string>();
    for (const j of model.journeys) m.set(j.id, j.short);
    return m;
  }, [model]);
  const tableName = (id: string) => model.tables.find((t) => t.id === id)?.name ?? id;
  const areaName = (id: string) => model.areas.find((a) => a.id === id)?.name ?? id;
  const healthy = p.missing.length === 0 && p.unplaced.length === 0;

  return (
    <section className="lp-prd" aria-labelledby="lp-prd-title">
      <h2 id="lp-prd-title">The PRD in one screen</h2>
      <p>Worked out from the stories and the code each time this page loads.</p>
      <div className="lp-prd-grid">
        <div className="lp-block lp-block-wide">
          <span className="lp-eyebrow">Purpose</span>
          <p className="lp-purpose">{p.purpose}</p>
          <span className="lp-label">Proposal — confirm or correct</span>
        </div>

        <div className="lp-block">
          <span className="lp-eyebrow">For whom</span>
          <ul className="lp-list">
            {p.people.map((x) => (
              <li key={x.name}>
                <b>{x.name}</b> — <span className="lp-muted">{x.plain}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lp-block">
          <span className="lp-eyebrow">What it must do</span>
          <ul className="lp-list">
            {model.journeys.map((j) => (
              <li key={j.id}>
                <button type="button" className="lp-link" onClick={() => onOpen(j.id)}>
                  {j.short}
                </button>{" "}
                — {j.who.charAt(0).toLowerCase() + j.who.slice(1)} wants to {j.goal}.
              </li>
            ))}
          </ul>
        </div>

        <div className="lp-block">
          <span className="lp-eyebrow">How it is made</span>
          <div className="lp-stats">
            <div className="lp-stat"><b>{p.counts.screens}</b><span>screens</span></div>
            <div className="lp-stat"><b>{p.counts.endpoints}</b><span>endpoints</span></div>
            <div className="lp-stat"><b>{p.counts.modules}</b><span>modules</span></div>
            <div className="lp-stat"><b>{p.counts.tables}</b><span>tables</span></div>
          </div>
          <ul className="lp-list">
            {model.repos.map((r) => (
              <li key={r.id}>
                <b>{r.name}</b> — {r.plain}.{" "}
                <span className="lp-muted">
                  {r.counts.screens ? `${r.counts.screens} screens · ` : ""}
                  {r.counts.endpoints} endpoints · {r.counts.modules} modules · {r.counts.tables} tables
                  {!r.available && " · from the saved snapshot"}
                </span>
              </li>
            ))}
            {p.stores.map((s) => (
              <li key={s.name}>
                <b>{s.name}</b> — {s.engine}
                {s.rows ? ", rows readable here" : ", structure only from here"}
              </li>
            ))}
            <li>
              <b>Outside services</b> — {p.services.join(", ")}
            </li>
          </ul>
        </div>

        <div className="lp-block">
          <span className="lp-eyebrow">Is this PRD up to date?</span>
          <div className={`lp-health ${p.missing.length ? "lp-health-warn" : "lp-health-ok"}`}>
            <span aria-hidden="true">{p.missing.length ? "!" : "✓"}</span>
            <div>
              {p.missing.length ? (
                <details className="lp-details">
                  <summary>{plural(p.missing.length, "story reference")} no longer match the code</summary>
                  <ul>
                    {p.missing.map((m) => (
                      <li key={`${m.ref}-${m.where}`}>
                        <code className="lp-mono">{m.ref}</code> in {m.where}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                "Every reference in the stories still matches the code."
              )}
            </div>
          </div>
          <div className={`lp-health ${p.unplaced.length ? "lp-health-warn" : "lp-health-ok"}`}>
            <span aria-hidden="true">{p.unplaced.length ? "!" : "✓"}</span>
            <div>
              {p.unplaced.length ? (
                <details className="lp-details">
                  <summary>{plural(p.unplaced.length, "piece")} of code belong to no part yet</summary>
                  <ul>
                    {p.unplaced.map((id) => (
                      <li key={id}>
                        <code className="lp-mono">{id}</code>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                "Every endpoint, module and table belongs to a part."
              )}
            </div>
          </div>
          <p className="lp-note">
            Read from {model.repos.map((r) => `${r.name} ${r.commit ?? (r.available ? "?" : "snapshot")}`).join(" · ")}.
          </p>
        </div>

        <div className="lp-block lp-block-wide">
          <span className="lp-eyebrow">Not explored yet</span>
          <ul className="lp-list">
            <li>
              <details className="lp-details">
                <summary>{plural(p.openSteps.length, "automatic step")} with nothing written about what can go wrong</summary>
                <ul>
                  {p.openSteps.map((s) => (
                    <li key={`${s.story}/${s.step}`}>
                      <button type="button" className="lp-link" onClick={() => onOpen(s.story, "flow", s.step)}>
                        {stepTitle.get(s.story)} → {s.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
            <li>
              <details className="lp-details">
                <summary>{plural(p.tablesInNoStory.length, "table")} no story uses</summary>
                <ul>
                  {p.tablesInNoStory.map((id) => (
                    <li key={id}>
                      <code className="lp-mono">{tableName(id)}</code>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
            <li>
              <details className="lp-details">
                <summary>{plural(p.areasInNoStory.length, "part")} and {plural(p.endpointsInNoStory.length, "endpoint")} no story passes through</summary>
                <ul>
                  {p.areasInNoStory.map((id) => (
                    <li key={id}>{areaName(id)}</li>
                  ))}
                  {p.endpointsInNoStory.map((id) => (
                    <li key={id}>
                      <code className="lp-mono">{id}</code>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
            <li className="lp-muted">
              The stories were written from the code, not from users&rsquo; words — treat them as assumptions until someone who uses {model.appName} confirms them.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
