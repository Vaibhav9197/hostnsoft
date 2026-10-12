// Draws the cover image for each blog post and writes it to
// public/assets/guides/<slug>.png (1200x630, the Open Graph size).
//
// Covers are committed static files on purpose: production is a Cloudflare
// Worker with no filesystem or image cache, so a generated OG route fails
// there (see docs/SEO.md, "Open Graph and Twitter cards").
//
// Style follows docs/DESIGN.md: the site's cream, warm ink and near-white
// surfaces, mock screens only, green only for a "Live" status.
//
//   node scripts/guide-covers.mjs
//
// To add a post's cover, add a function to COVERS keyed by its slug.

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "assets", "guides");

const C = {
  bg: "#f5f4f0", surface: "#fdfdfb", s2: "#eceae3", s3: "#ddd7cc",
  ink: "#1a1916", soft: "#6f6a62", faint: "#9b958b", line: "#e5e1d8", strong: "#d4cec3",
  ok: "#16a34a", okSoft: "#dcefe0",
};
const SANS = "Segoe UI, Inter, Helvetica, Arial, sans-serif";
const MONO = "Consolas, Menlo, monospace";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const text = (x, y, s, { size = 20, weight = 400, fill = C.ink, font = SANS, anchor = "start" } = {}) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;
const bar = (x, y, w, h = 12, fill = C.s3, r = 6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;

/* A soft drop shadow shared by every floating panel. */
const DEFS = `<defs>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="160%">
    <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#141210" flood-opacity="0.12"/>
    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#141210" flood-opacity="0.05"/>
  </filter>
  <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="${C.strong}"/></pattern>
</defs>`;

const frame = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
${DEFS}
<rect width="1200" height="630" fill="${C.bg}"/>
<rect width="1200" height="630" fill="url(#dots)" opacity="0.55"/>
${inner}
</svg>`;

/* A browser window with an address bar and an optional "Live" pill. */
function browser(x, y, w, h, url, content, { live = true } = {}) {
  /* Size the address to fit the bar: a mono glyph is about 0.55em wide, and
     the bar must end before the Live pill. */
  const room = w - 96 - (live ? 124 : 24) - 52;
  const urlSize = Math.min(17, Math.floor(room / (url.length * 0.55)));
  const pillW = Math.ceil(url.length * urlSize * 0.55) + 56;
  return `<g filter="url(#sh)">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="${C.surface}" stroke="${C.line}"/>
  </g>
  <path d="M${x + 22} ${y}h${w - 44}a22 22 0 0 1 22 22v38h-${w}v-38a22 22 0 0 1 22-22z" fill="${C.s2}"/>
  <line x1="${x}" y1="${y + 60}" x2="${x + w}" y2="${y + 60}" stroke="${C.line}"/>
  <circle cx="${x + 28}" cy="${y + 30}" r="6" fill="${C.strong}"/><circle cx="${x + 48}" cy="${y + 30}" r="6" fill="${C.strong}"/><circle cx="${x + 68}" cy="${y + 30}" r="6" fill="${C.strong}"/>
  <rect x="${x + 96}" y="${y + 14}" width="${pillW}" height="32" rx="16" fill="${C.surface}" stroke="${C.line}"/>
  <path d="M${x + 114} ${y + 33}v-5a5 5 0 0 1 10 0v5" fill="none" stroke="${C.soft}" stroke-width="2"/><rect x="${x + 111}" y="${y + 31}" width="16" height="10" rx="2" fill="${C.soft}"/>
  ${text(x + 136, y + 36, url, { size: urlSize, font: MONO, fill: C.ink })}
  ${live ? `<rect x="${x + w - 112}" y="${y + 15}" width="92" height="30" rx="15" fill="${C.okSoft}"/>
  <circle cx="${x + w - 92}" cy="${y + 30}" r="6" fill="${C.ok}"/>${text(x + w - 78, y + 36, "Live", { size: 16, weight: 600, fill: "#15753a" })}` : ""}
  <g transform="translate(${x},${y + 60})">${content}</g>`;
}

/* A plain floating card. */
const card = (x, y, w, h, inner, fill = C.surface) =>
  `<g filter="url(#sh)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${fill}" stroke="${C.line}"/></g><g transform="translate(${x},${y})">${inner}</g>`;

const arrow = (x1, y, x2, label) => `
  <line x1="${x1}" y1="${y}" x2="${x2 - 14}" y2="${y}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 10"/>
  <path d="M${x2 - 18} ${y - 10}l14 10-14 10" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  ${label ? `<rect x="${(x1 + x2) / 2 - 58}" y="${y - 50}" width="116" height="34" rx="17" fill="${C.ink}"/>${text((x1 + x2) / 2, y - 27, label, { size: 16, weight: 600, fill: C.bg, font: MONO, anchor: "middle" })}` : ""}`;

/* A small landing-page mock: heading bars, a button, three tiles. */
function siteMock(w) {
  const pad = 40;
  return `${bar(pad, 46, w * 0.42, 22, C.ink, 8)}${bar(pad, 82, w * 0.6, 12)}${bar(pad, 104, w * 0.5, 12)}
  <rect x="${pad}" y="134" width="132" height="40" rx="20" fill="${C.ink}"/>${bar(pad + 26, 149, 80, 10, C.bg, 5)}
  ${[0, 1, 2].map((i) => {
    const tw = (w - pad * 2 - 32) / 3, tx = pad + i * (tw + 16);
    return `<rect x="${tx}" y="200" width="${tw}" height="118" rx="14" fill="${C.s2}"/>${bar(tx + 16, 280, tw * 0.6, 10)}${bar(tx + 16, 298, tw * 0.4, 8, C.strong, 4)}`;
  }).join("")}`;
}

const COVERS = {
  /* Folder on disk -> .tar.gz -> live app, with no repository involved. */
  "deploy-app-without-github": () => frame(`
    ${card(70, 150, 330, 340, `
      <path d="M28 40h70l18 18h186a12 12 0 0 1 12 12v0H28z" fill="${C.s3}"/>
      <rect x="28" y="58" width="286" height="2" fill="${C.strong}"/>
      ${text(28, 104, "my-app/", { size: 24, weight: 700, font: MONO })}
      ${["package.json", "server.js", "public/", "README.md"].map((f, i) => `
        <rect x="28" y="${128 + i * 44}" width="22" height="26" rx="4" fill="${C.s2}" stroke="${C.strong}"/>
        ${text(64, 148 + i * 44, f, { size: 19, font: MONO, fill: C.ink })}`).join("")}
      ${text(28, 316, ".env  (left out)", { size: 17, font: MONO, fill: C.faint })}
      <line x1="27" y1="311" x2="72" y2="311" stroke="${C.faint}" stroke-width="2"/>
    `)}
    <g transform="translate(430,186)">
      <rect width="150" height="58" rx="14" fill="${C.surface}" stroke="${C.strong}" stroke-dasharray="7 7"/>
      ${text(75, 25, "git repo", { size: 17, font: MONO, fill: C.faint, anchor: "middle" })}
      ${text(75, 46, "not needed", { size: 15, fill: C.faint, anchor: "middle" })}
      <line x1="18" y1="50" x2="132" y2="8" stroke="${C.faint}" stroke-width="2"/>
    </g>
    ${arrow(420, 330, 600, ".tar.gz")}
    ${browser(610, 120, 520, 400, "your-app-name.embarko.app", siteMock(520))}
  `),

  /* Ask Claude Code to deploy -> a live portfolio site. */
  "host-website-built-with-claude": () => frame(`
    ${card(60, 120, 470, 400, `
      <rect width="470" height="54" rx="18" fill="${C.ink}"/><rect y="36" width="470" height="18" fill="${C.ink}"/>
      <circle cx="26" cy="27" r="6" fill="#4a463f"/><circle cx="46" cy="27" r="6" fill="#4a463f"/><circle cx="66" cy="27" r="6" fill="#4a463f"/>
      ${text(235, 33, "Claude Code", { size: 16, weight: 600, fill: "#d9d6ce", anchor: "middle" })}
      <rect x="22" y="78" width="426" height="64" rx="14" fill="${C.s2}"/>
      ${text(40, 106, "Deploy my portfolio to Embarko", { size: 19, weight: 600 })}
      ${text(40, 130, "and share the live link", { size: 19, weight: 600 })}
      ${[
        ["›", "packing folder as .tar.gz", C.soft],
        ["›", "uploading to Embarko", C.soft],
        ["›", "building static site", C.soft],
        ["✓", "status: live", C.ok],
      ].map(([m, t, col], i) => `${text(34, 186 + i * 40, m, { size: 20, weight: 700, font: MONO, fill: col })}${text(60, 186 + i * 40, t, { size: 18, font: MONO, fill: i === 3 ? C.ink : C.soft })}`).join("")}
      <rect x="22" y="340" width="426" height="40" rx="12" fill="${C.surface}" stroke="${C.ok}"/>
      ${text(40, 366, "your-site-name.embarko.app", { size: 17, font: MONO, weight: 600 })}
    `)}
    ${arrow(545, 320, 640, null)}
    ${browser(650, 96, 490, 440, "your-site-name.embarko.app", `
      <circle cx="245" cy="78" r="38" fill="${C.s3}"/><circle cx="245" cy="68" r="14" fill="${C.surface}"/><path d="M219 104a26 22 0 0 1 52 0" fill="${C.surface}"/>
      ${bar(160, 132, 170, 20, C.ink, 8)}${bar(185, 162, 120, 10)}
      ${[0, 1, 2, 3].map((i) => {
        const tx = 40 + (i % 2) * 215, ty = 194 + Math.floor(i / 2) * 92;
        return `<rect x="${tx}" y="${ty}" width="195" height="76" rx="12" fill="${C.s2}"/>${bar(tx + 14, ty + 50, 110, 9)}`;
      }).join("")}
    `)}
  `),

  /* Cursor's agent gets the prompt, sandbox.json lets it reach Embarko, the app goes live. */
  "deploy-from-cursor": () => frame(`
    ${card(50, 96, 500, 330, `
      <rect width="500" height="50" rx="18" fill="${C.s2}"/><rect y="32" width="500" height="18" fill="${C.s2}"/>
      <line x1="0" y1="50" x2="500" y2="50" stroke="${C.line}"/>
      <circle cx="26" cy="25" r="6" fill="${C.strong}"/><circle cx="46" cy="25" r="6" fill="${C.strong}"/><circle cx="66" cy="25" r="6" fill="${C.strong}"/>
      ${text(250, 31, "Cursor", { size: 16, weight: 600, fill: C.soft, anchor: "middle" })}
      <line x1="200" y1="50" x2="200" y2="330" stroke="${C.line}"/>
      ${[0, 1, 2, 3, 4, 5, 6].map((i) => bar(24, 76 + i * 30, [120, 90, 140, 70, 110, 130, 80][i], 10, i % 3 ? C.s3 : C.strong, 5)).join("")}
      ${text(222, 80, "Agent", { size: 14, weight: 700, fill: C.soft })}
      <rect x="222" y="94" width="254" height="74" rx="12" fill="${C.s2}"/>
      ${text(238, 120, "Embarko deployment prompt", { size: 15, weight: 600 })}
      ${text(238, 146, "help me get it live", { size: 15, fill: C.soft })}
      ${[
        ["›", "packing folder as .tar.gz", C.soft],
        ["›", "uploading to ship.embarko.ai", C.soft],
        ["✓", "status: live", C.ok],
      ].map(([m, t, col], i) => `${text(226, 204 + i * 32, m, { size: 17, weight: 700, font: MONO, fill: col })}${text(246, 204 + i * 32, t, { size: 14.5, font: MONO, fill: i === 2 ? C.ink : C.soft })}`).join("")}
    `)}
    ${card(90, 448, 420, 132, `
      ${text(24, 36, ".cursor/sandbox.json", { size: 16, weight: 700, font: MONO })}
      ${text(24, 66, '"allow": [', { size: 15, font: MONO, fill: C.soft })}
      ${text(44, 92, '"embarko.ai", "ship.embarko.ai",', { size: 15, font: MONO, fill: C.ink })}
      ${text(44, 116, '"*.embarko.app" ]', { size: 15, font: MONO, fill: C.ink })}
      <circle cx="390" cy="32" r="11" fill="${C.ok}"/><path d="M384 32l4 4 8-9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    `)}
    ${arrow(562, 300, 672, "one prompt")}
    ${browser(682, 120, 470, 390, "your-app-name.embarko.app", siteMock(470))}
  `),

  /* A student's projects, the Free plan's real limits, and the live link. */
  "free-hosting-for-students": () => frame(`
    ${card(40, 110, 280, 150, `
      <path d="M24 34h52l14 14h186a10 10 0 0 1 10 10v0H24z" fill="${C.s3}"/>
      ${text(24, 96, "portfolio/", { size: 22, weight: 700, font: MONO })}
      ${text(24, 126, "index.html · style.css", { size: 15, font: MONO, fill: C.soft })}
    `)}
    ${card(40, 290, 280, 170, `
      <path d="M24 34h52l14 14h186a10 10 0 0 1 10 10v0H24z" fill="${C.s3}"/>
      ${text(24, 96, "college-project/", { size: 22, weight: 700, font: MONO })}
      ${text(24, 126, "app.py · requirements.txt", { size: 15, font: MONO, fill: C.soft })}
      ${text(24, 150, "data.db in DATA_DIR", { size: 15, font: MONO, fill: C.soft })}
    `)}
    ${card(345, 170, 270, 230, `
      ${text(28, 50, "Free plan", { size: 17, weight: 700, fill: C.soft })}
      ${text(28, 104, "$0", { size: 54, weight: 800 })}
      ${text(98, 104, "/ month", { size: 17, fill: C.soft })}
      ${["Unlimited static websites", "1 dynamic app", "256MB · Embarko branding"].map((t, i) => `
        <circle cx="38" cy="${140 + i * 30}" r="8" fill="${i < 2 ? C.ok : C.s3}"/>
        ${i < 2 ? `<path d="M34 ${140 + i * 30}l3 3 6-6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
        ${text(56, 146 + i * 30, t, { size: 15, fill: i < 2 ? C.ink : C.soft })}`).join("")}
    `)}
    ${arrow(625, 290, 702, null)}
    ${browser(712, 110, 450, 400, "your-app-name.embarko.app", siteMock(450))}
  `),

  /* Replit's "Download as zip", the zip, and the app live on Embarko. */
  "deploy-replit-app-free": () => frame(`
    ${card(40, 100, 410, 250, `
      ${text(24, 40, "Files", { size: 16, weight: 700, fill: C.soft })}
      <circle cx="362" cy="34" r="3" fill="${C.ink}"/><circle cx="372" cy="34" r="3" fill="${C.ink}"/><circle cx="382" cy="34" r="3" fill="${C.ink}"/>
      ${["main.py", "requirements.txt", "templates/"].map((f, i) => `${text(24, 84 + i * 30, f, { size: 16, font: MONO })}`).join("")}
      <rect x="200" y="58" width="190" height="132" rx="12" fill="${C.surface}" stroke="${C.strong}"/>
      ${text(218, 90, "Rename", { size: 15, fill: C.soft })}
      ${text(218, 120, "Upload file", { size: 15, fill: C.soft })}
      <rect x="208" y="138" width="174" height="38" rx="9" fill="${C.ink}"/>
      ${text(222, 163, "Download as zip", { size: 15, weight: 700, fill: C.bg })}
    `)}
    ${card(70, 380, 260, 120, `
      <rect x="24" y="26" width="52" height="66" rx="8" fill="${C.s2}" stroke="${C.strong}"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="${i % 2 ? 50 : 44}" y="${34 + i * 10}" width="8" height="6" fill="${C.strong}"/>`).join("")}
      ${text(96, 56, "my-app.zip", { size: 19, weight: 700, font: MONO })}
      ${text(96, 82, "unzip, open in agent", { size: 15, fill: C.soft })}
    `)}
    ${arrow(458, 300, 560, null)}
    ${browser(570, 120, 590, 400, "your-app-name.embarko.app", siteMock(590))}
  `),

  /* Antigravity's agent asks to run the upload; Allow; the site is live. */
  "deploy-antigravity-website": () => frame(`
    ${card(50, 96, 520, 400, `
      <rect width="520" height="50" rx="18" fill="${C.s2}"/><rect y="32" width="520" height="18" fill="${C.s2}"/>
      <line x1="0" y1="50" x2="520" y2="50" stroke="${C.line}"/>
      <circle cx="26" cy="25" r="6" fill="${C.strong}"/><circle cx="46" cy="25" r="6" fill="${C.strong}"/><circle cx="66" cy="25" r="6" fill="${C.strong}"/>
      ${text(260, 31, "Antigravity · Agent", { size: 16, weight: 600, fill: C.soft, anchor: "middle" })}
      <rect x="24" y="72" width="472" height="62" rx="12" fill="${C.s2}"/>
      ${text(42, 99, "Embarko deployment prompt", { size: 16, weight: 600 })}
      ${text(42, 122, "put my website live", { size: 15, fill: C.soft })}
      <rect x="24" y="152" width="472" height="164" rx="14" fill="${C.surface}" stroke="${C.ink}" stroke-width="1.5"/>
      ${text(44, 184, "Run command?", { size: 16, weight: 700 })}
      <rect x="44" y="198" width="432" height="44" rx="8" fill="${C.s2}"/>
      ${text(58, 226, "upload project to ship.embarko.ai", { size: 15, font: MONO })}
      <rect x="44" y="258" width="104" height="40" rx="20" fill="${C.ink}"/>${text(96, 284, "Allow", { size: 16, weight: 700, fill: C.bg, anchor: "middle" })}
      <rect x="160" y="258" width="96" height="40" rx="20" fill="${C.surface}" stroke="${C.strong}"/>${text(208, 284, "Deny", { size: 16, fill: C.soft, anchor: "middle" })}
      ${text(42, 356, "✓", { size: 18, weight: 700, font: MONO, fill: C.ok })}${text(66, 356, "status: live", { size: 16, font: MONO })}
    `)}
    ${arrow(588, 300, 682, null)}
    ${browser(692, 110, 460, 400, "your-site-name.embarko.app", siteMock(460))}
  `),

  /* A live chat app, its key kept as an env var, calling a model API elsewhere. */
  "how-to-deploy-ai-app": () => frame(`
    ${browser(60, 90, 600, 450, "your-app-name.embarko.app", `
      <rect x="40" y="34" width="300" height="56" rx="16" fill="${C.s2}"/>${bar(62, 54, 220, 11)}${bar(62, 72, 150, 9, C.strong, 4)}
      <rect x="230" y="110" width="330" height="56" rx="16" fill="${C.ink}"/>${bar(254, 130, 250, 11, "#5b574f")}${bar(254, 148, 170, 9, "#4a463f", 4)}
      <rect x="40" y="186" width="360" height="74" rx="16" fill="${C.s2}"/>${bar(62, 206, 290, 11)}${bar(62, 224, 250, 11)}${bar(62, 242, 160, 9, C.strong, 4)}
      <rect x="40" y="318" width="520" height="52" rx="26" fill="${C.surface}" stroke="${C.strong}"/>
      ${text(66, 350, "Ask about your documents…", { size: 17, fill: C.faint })}
      <circle cx="532" cy="344" r="18" fill="${C.ink}"/><path d="M525 344h14m-6-6 6 6-6 6" fill="none" stroke="${C.bg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    `)}
    ${card(700, 110, 440, 190, `
      ${text(28, 44, "Environment", { size: 15, weight: 700, fill: C.soft })}
      <rect x="28" y="64" width="384" height="52" rx="12" fill="${C.s2}"/>
      <rect x="44" y="80" width="22" height="20" rx="4" fill="none" stroke="${C.ink}" stroke-width="2.2"/><path d="M49 80v-5a6 6 0 0 1 12 0v5" fill="none" stroke="${C.ink}" stroke-width="2.2"/>
      ${text(80, 97, "MODEL_API_KEY", { size: 18, weight: 600, font: MONO })}
      ${text(396, 97, "••••••••", { size: 18, font: MONO, fill: C.soft, anchor: "end" })}
      <circle cx="40" cy="152" r="9" fill="${C.ok}"/><path d="M35 152l4 4 7-8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      ${text(58, 158, "Applied · encrypted · write-only", { size: 16, fill: C.soft })}
    `)}
    <path d="M660 430 C 760 430, 760 420, 830 420" fill="none" stroke="${C.ink}" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>
    <rect x="690" y="392" width="88" height="30" rx="15" fill="${C.ink}"/>${text(734, 413, "HTTPS", { size: 14, weight: 700, fill: C.bg, font: MONO, anchor: "middle" })}
    ${card(840, 350, 300, 150, `
      <path d="M58 92a26 26 0 0 1 4-51 34 34 0 0 1 64-6 26 26 0 0 1 22 49z" fill="${C.s3}"/>
      ${text(170, 64, "Model API", { size: 22, weight: 700 })}
      ${text(170, 92, "hosted elsewhere", { size: 16, fill: C.soft })}
      ${text(28, 128, "no GPU needed on Embarko", { size: 15, fill: C.faint })}
    `)}
  `),
};

mkdirSync(OUT, { recursive: true });
for (const [slug, draw] of Object.entries(COVERS)) {
  const svg = draw();
  const file = join(OUT, `${slug}.png`);
  await sharp(Buffer.from(svg), { density: 144 }).resize(1200, 630).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(file);
  console.log("wrote", file);
}
