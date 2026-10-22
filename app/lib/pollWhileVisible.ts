/**
 * Runs `tick` every `intervalMs` while the tab is visible, and stops for good
 * after `giveUpMs`. A background tab polling for half an hour is load on the
 * API that nobody sees, so the interval pauses on `visibilitychange` and runs
 * once straight away when the tab comes back, so the view catches up.
 *
 * Returns a cleanup for a `useEffect`.
 */
export function pollWhileVisible(
  tick: () => void,
  { intervalMs, giveUpMs }: { intervalMs: number; giveUpMs: number },
): () => void {
  let id: number | null = null;
  let done = false;

  const stop = () => {
    if (id !== null) window.clearInterval(id);
    id = null;
  };
  const run = () => {
    if (done || id !== null || document.hidden) return;
    id = window.setInterval(tick, intervalMs);
  };
  const onVisibility = () => {
    if (document.hidden) stop();
    else {
      run();
      if (!done) tick();
    }
  };

  document.addEventListener("visibilitychange", onVisibility);
  run();
  const giveUp = window.setTimeout(() => {
    done = true;
    stop();
  }, giveUpMs);

  return () => {
    done = true;
    stop();
    window.clearTimeout(giveUp);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
