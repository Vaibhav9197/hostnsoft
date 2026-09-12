"use client";

import { useEffect, useState } from "react";

import { useTheme } from "../../lib/theme";

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

/* The night counterparts. Same framing and the same job, but the brightness
   rule inverts: on the dark ground it's the *light* parts of a photo that fight
   the text, so these want to be low-key — a moonlit band or a scatter of stars,
   never a bright moon high in frame. Self-hosted for the same reason the day
   skies are — the backdrop is part of the product and shouldn't depend on a
   third-party host. */
const NIGHT_CLOUDS = [
  "/atmosphere/night-clear.jpg", // deep blue, stars, a few thin clouds
  "/atmosphere/night-stars.jpg", // stars above a dark cloud bank
  "/atmosphere/night-moonlit.jpg", // moonlight diffused through cloud
];

export function CloudBackdrop() {
  const { theme } = useTheme();
  const sky = theme === "dark" ? NIGHT_CLOUDS : CLOUDS;

  /* Index 0 on the server and on first paint, then a random one after mount:
     picking randomly during render would make the server and client markup
     disagree and trip a hydration mismatch. */
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(Math.floor(Math.random() * sky.length));
  }, [sky.length]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-top"
        style={{ backgroundImage: `url('${sky[index]}')` }}
      />
      {/* The photo itself is untouched — full strength, no opacity. All the
          blending is this one gradient, which leaves the sky clear at the top
          and washes to the solid page ground by the time the content starts,
          so text never sits on photography. One dimmer, in one place. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background" />
    </div>
  );
}
