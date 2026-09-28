"use client";

import { useEffect, useRef } from "react";

/**
 * A creator's screenshot. If the link is broken, the gallery tile holding it
 * is hidden rather than showing an empty frame — the same rule as having no
 * screenshot at all. Outside a tile (the app's own page) it just stays empty.
 */
export function ShotImage({ src, alt, eager }: { src: string; alt: string; eager?: boolean }) {
  const ref = useRef<HTMLImageElement>(null);

  const hideTile = (img: HTMLImageElement) =>
    img.closest<HTMLElement>(".sc-tile")?.setAttribute("hidden", "");

  /* The server-rendered image can fail before React attaches onError, so
     check once after hydration too. */
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) hideTile(img);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party URLs; see Shot
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      onError={(e) => hideTile(e.currentTarget)}
    />
  );
}
