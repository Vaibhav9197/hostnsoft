"use client";

import { useEffect, useState } from "react";

/**
 * A soft sky behind the projects list.
 *
 * Cloud photographs from Unsplash — free to use under the Unsplash licence, no
 * attribution required. All five are deliberately high-key: they sit under real
 * content, and anything darker fights the text over it.
 */
const CLOUDS = [
  "photo-1504253163759-c23fccaebb55", // Vladimir Anikeev — white cloudtops
  "photo-1428908728789-d2de25dbd4e2", // Dominik Schröder — cloud sea at altitude
  "photo-1536514498073-50e69d39c6cf", // Carlos Torres — pale cumulus
  "photo-1501630834273-4b5604d2ee31", // Billy Huynh — bright fair-weather cloud
  "photo-1547963802-25f153e14080", // Matt Palmer — soft cream sky
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
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-top opacity-[0.22] transition-opacity duration-700"
        style={{
          backgroundImage: `url('https://images.unsplash.com/${CLOUDS[index]}?auto=format&fit=crop&w=2400&q=60')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/35 via-background/75 to-background" />
    </div>
  );
}
