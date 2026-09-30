"use client";

import { useEffect, useRef } from "react";

/* Luma-style background for the /pages hero: a faint dot grid. Moving the
   cursor over the hero lights the dots around it in the poster tones, and
   they fade away behind it. Nothing moves on its own. Decorative only —
   hidden from assistive tech, and a still grid under reduced motion. */

const GAP = 16; // px between dots
const R = 1; // grid dot radius
const SPARK_R = 2.3; // a lit dot swells a little
const BASE_ALPHA = 0.09;
const TONES = ["#f5a300", "#1f8ef1", "#ff6a2b", "#3fb52a", "#e0b800", "#12b39a", "#ff4d2e", "#00a6c7", "#8cc200", "#4f6bff", "#ff3d5a"];
const LIFE = 1700; // ms a lit dot takes to fade
const SPAWN_EVERY = 28; // ms between trail bursts while the cursor moves
const REACH = 2; // cells around the cursor that can light

type Spark = { x: number; y: number; color: string; born: number; delay: number };

export function HeroDots() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let ink = "#1a1916";
    let sparks: Spark[] = [];
    let raf = 0;
    let lastSpawn = 0;
    let tone = 0;
    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP);
      rows = Math.ceil(h / GAP);
      ink = getComputedStyle(canvas!).getPropertyValue("--ds-ink").trim() || ink;
    }

    function dot(cx: number, cy: number, color: string, alpha: number, r = R) {
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = color;
      ctx!.beginPath();
      ctx!.arc(cx * GAP + GAP / 2, cy * GAP + GAP / 2, r, 0, Math.PI * 2);
      ctx!.fill();
    }

    function grid() {
      ctx!.clearRect(0, 0, w, h);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) dot(x, y, ink, BASE_ALPHA);
    }

    /* A few dots around the cursor, in one tone that slowly walks the
       palette, so a long stroke leaves a soft rainbow trail. */
    function burst(px: number, py: number, now: number) {
      const cx = Math.floor(px / GAP);
      const cy = Math.floor(py / GAP);
      const color = TONES[Math.floor(tone) % TONES.length];
      tone += 0.08;
      const n = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        sparks.push({
          x: cx + Math.floor(Math.random() * (REACH * 2 + 1)) - REACH,
          y: cy + Math.floor(Math.random() * (REACH * 2 + 1)) - REACH,
          color,
          born: now,
          delay: i * 40,
        });
      }
    }

    /* Draws only while something is lit; stops itself once all have faded. */
    function frame(now: number) {
      grid();
      sparks = sparks.filter((s) => now - s.born - s.delay < LIFE);
      for (const s of sparks) {
        const t = (now - s.born - s.delay) / LIFE;
        if (t < 0) continue;
        const k = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85; // quick rise, slow fade
        dot(s.x, s.y, s.color, k, R + (SPARK_R - R) * k);
      }
      ctx!.globalAlpha = 1;
      raf = sparks.length ? requestAnimationFrame(frame) : 0;
    }

    size();
    grid();

    const ro = new ResizeObserver(() => {
      size();
      grid();
    });
    ro.observe(canvas);

    /* The canvas ignores the pointer so the buttons stay clickable; listen
       on the hero around it instead. */
    const host = canvas.parentElement;
    if (!reduced && host) {
      const onMove = (e: PointerEvent) => {
        const now = performance.now();
        if (now - lastSpawn < SPAWN_EVERY) return;
        lastSpawn = now;
        const rect = canvas.getBoundingClientRect();
        burst(e.clientX - rect.left, e.clientY - rect.top, now);
        if (!raf) raf = requestAnimationFrame(frame);
      };
      host.addEventListener("pointermove", onMove);
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        host.removeEventListener("pointermove", onMove);
      };
    }
    return () => ro.disconnect();
  }, []);

  return <canvas ref={ref} className="pg-dots" aria-hidden="true" />;
}
