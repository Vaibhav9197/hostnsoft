import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * The default link-preview card, served as /opengraph-image and attached to
 * every page through the root layout's metadata. Pages with a better image of
 * their own (a Showcase app's screenshot) override it in their own metadata.
 *
 * Drawn with plain elements and system-ish fonts rather than a designed PNG so
 * it needs no asset pipeline and stays in step with the copy on the site.
 */
export const alt = "Embarko — Instant hosting for every app you build with AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Read off disk rather than fetched from the live site, so the card renders
   correctly on the very first deploy and never depends on a network call. This
   route has no dynamic input, so Next prerenders it during `next build` on a
   machine that has a filesystem; the Worker only ever serves the finished PNG. */
function iconDataUri() {
  const svg = readFileSync(join(process.cwd(), "public/assets/embarko-icon.svg"));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(160deg, #eaf3ff 0%, #f8fbff 55%, #ffffff 100%)",
          color: "#0f172a",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 700 }}>
          <img src={iconDataUri()} width={64} height={64} alt="" />
          Embarko
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>
            Instant hosting for every app you build with AI
          </div>
          <div style={{ fontSize: 32, color: "#475569" }}>
            Copy one prompt. Ask your agent to deploy. Get a live URL.
          </div>
        </div>
        <div style={{ fontSize: 28, color: "#64748b" }}>embarko.ai</div>
      </div>
    ),
    size,
  );
}
