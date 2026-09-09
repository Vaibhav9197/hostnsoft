"use client";

import { useEffect, useState } from "react";

/**
 * A soft sky behind the projects list.
 *
 * Served from /public rather than Unsplash: the backdrop is part of the product
 * now, so it shouldn't depend on a third-party host staying up or keeping a
 * photo at the same URL. All three are deliberately high-key — they sit under
 * real content, and anything darker fights the text over it.
 */
const CLOUDS = [
  "/atmosphere/sky-clear.jpg", // open blue, a few wisps at the edges
  "/atmosphere/sky-sunrise.jpg", // pale sunrise, warm low band
  "/atmosphere/sky-cumulus.jpg", // blue above a band of cumulus
];

export function CloudBackdrop() {
  /* Index 0 on the server and on first paint, then a random one after mount:
     picking randomly during render would make the server and client markup
     disagree and trip a hydration mismatch. */
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(Math.floor(Math.random() * CLOUDS.length));
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-top opacity-[0.22] transition-opacity duration-700"
        style={{ backgroundImage: `url('${CLOUDS[index]}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/35 via-background/75 to-background" />
    </div>
  );
}
