"use client";

import { useCallback, useRef, useState } from "react";
import { useEarlyAccess } from "./EarlyAccess";

// Rotating placeholder prompts so the box feels alive.
const PROMPTS = [
  "Build me an order tracker for my café…",
  "A booking tool for my salon…",
  "An expense approval flow for my team…",
  "A lead intake form that texts me…",
  "A daily checklist for my shop staff…",
];

export function HeroEntry() {
  const { open } = useEarlyAccess();
  const [prompt, setPrompt] = useState("");
  const [placeholder] = useState(() => PROMPTS[0]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const submitPrompt = useCallback(() => {
    const value = prompt.trim();
    open({
      app: value,
      context: value
        ? "We’ll build this as soon as your workspace is ready."
        : "Describe the app you want and we’ll build it for you.",
    });
  }, [open, prompt]);

  const openUpload = useCallback(
    (fileName?: string) => {
      open({
        app: fileName ? `I already made an app with AI — file: ${fileName}` : "",
        context: fileName
          ? `Ready to give “${fileName}” a home. Join early access to upload it.`
          : "Already made one with AI? Join early access to drop it in.",
      });
    },
    [open],
  );

  return (
    <div className="entry" aria-label="Three ways to start">
      {/* 1 — Describe it (primary, largest) */}
      <div className="entry-main">
        <div className="entry-tag">
          <span className="entry-badge">1</span> Describe it
        </div>
        <div className="prompt-box">
          <textarea
            className="prompt-input"
            placeholder={placeholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitPrompt();
              }
            }}
            rows={2}
            aria-label="Describe the app you want to build"
          />
          <button className="prompt-send" onClick={submitPrompt} aria-label="Build this app">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <div className="prompt-hint">
          Start with nothing. Type what you want — press <kbd>Enter</kbd> to build it.
        </div>
      </div>

      {/* 2 + 3 — bring your own */}
      <div className="entry-side">
        {/* Upload a folder */}
        <button
          type="button"
          className={`entry-card${dragOver ? " drag" : ""}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            openUpload(f?.name);
          }}
        >
          <span className="entry-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15V3m0 0-4 4m4-4 4 4" />
              <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
            </svg>
          </span>
          <div className="entry-copy">
            <div className="entry-title">
              <span className="entry-badge sm">2</span> Upload a folder
            </div>
            <div className="entry-sub">Already made one with AI? Drop it here.</div>
            <div className="entry-src">ChatGPT · Claude · Bolt · v0 · Lovable · plain HTML</div>
          </div>
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          // @ts-expect-error non-standard but widely supported directory picker
          webkitdirectory=""
          onChange={(e) => openUpload(e.target.files?.[0]?.name)}
        />

        {/* Connect GitHub */}
        <button
          type="button"
          className="entry-card"
          onClick={() =>
            open({
              context: "Connect a repo and auto-deploy on push. Join early access to link GitHub.",
            })
          }
        >
          <span className="entry-ic gh">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.41 7.86 10.94.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.08.78 2.18 0 1.57-.02 2.84-.02 3.23 0 .31.21.68.8.56A11.53 11.53 0 0 0 23.5 12.02C23.5 5.74 18.27.5 12 .5Z" />
            </svg>
          </span>
          <div className="entry-copy">
            <div className="entry-title">
              <span className="entry-badge sm">3</span> Connect GitHub
            </div>
            <div className="entry-sub">Or connect a repo.</div>
            <div className="entry-src">Auto-deploy on every push</div>
          </div>
        </button>
      </div>
    </div>
  );
}
