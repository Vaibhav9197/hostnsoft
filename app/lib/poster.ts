import { qrMatrix } from "./qr";

/**
 * The event poster: an A4 portrait PNG an organiser can print or post, with
 * the event's name, its one-line description, a QR code for the page and the
 * page's address.
 *
 * One renderer serves both the live preview and the download, so what the
 * organiser watches draw itself is exactly the file they get. It works in
 * poster pixels (1654×2339, A4 at 200dpi); the preview scales the context
 * down, the download draws at full size.
 *
 * The QR modules are drawn separately from everything else (drawQrModules)
 * so the preview can put them on their own layer and fade them in.
 */

export const POSTER_W = 1654;
export const POSTER_H = 2339;

/* Always the light palette, whatever theme the panel is in: this is a
   printed page, and ink on paper is what prints. The one place in the panel
   that spells out hex values — they describe an exported image, not the UI.
   Same values as the light tokens in app/base.css. */
const PAPER = "#f5f4f0";
const CARD = "#fdfdfb";
const INK = "#1a1916";
const SOFT = "#6f6a62";
const FAINT = "#736d65";
const LINE = "#e5e1d8";

const SIDE = 132;
const TEXT_W = POSTER_W - SIDE * 2; // 1390

const TITLE_TOP = 300;
const TITLE_MAX = 150;
const TITLE_MIN = 84;
const TITLE_STEP = 6;
const TITLE_LINES = 3;

const INTRO_GAP = 40;
const INTRO_SIZE = 46;
const INTRO_W = 1200;
const INTRO_LINES = 3;

const CARD_TOP_MIN = 1150;
const CARD_GAP = 96;
const CARD_MAX = 820;
const CARD_MIN = 700;
const CARD_PAD = 60;

/* Everything under the card, top to bottom: gap, the "Scan to see…" line
   (ascent and descent of its 72px serif), gap, the address. */
const TAG_GAP = 90;
const TAG_ASCENT = 58;
const TAG_DESCENT = 18;
const ADDR_GAP = 28;
const ADDR_MAX = 40;
const ADDR_MIN = 26;
const FOOTER_BASELINE = POSTER_H - SIDE;
const FOOTER_SIZE = 28;
/* Breathing room kept between the address and the footer. */
const FOOTER_CLEAR = 72;
const CARD_BOTTOM_MAX =
  FOOTER_BASELINE - FOOTER_SIZE - FOOTER_CLEAR - (TAG_GAP + TAG_ASCENT + TAG_DESCENT + ADDR_GAP + ADDR_MAX);

export type PosterFonts = { sans: string; serif: string; mono: string };

export type PosterInput = {
  /** Raw; blank draws "Your event name" as a placeholder. */
  title: string;
  intro?: string | null;
  /** What the QR encodes. Its host and path are printed as the address. */
  pageUrl: string;
  /** The not-yet-created look: placeholder-grey address. */
  ghost?: boolean;
};

export type PosterLayout = { card: { x: number; y: number; size: number } };

/* ------------------------------------------------------------------ fonts */

let fontsPromise: Promise<PosterFonts> | null = null;

/**
 * The page's own faces, read from the live CSS so the poster matches the
 * panel: the serif accent (next/font's --font-ds-serif), the body sans and
 * the --mono stack. Resolved once per page load and waited on, because a
 * canvas silently falls back to a default face if it draws before the web
 * font has arrived. Never rejects: a slow or failed font load draws with the
 * fallbacks instead.
 */
export function loadPosterFonts(): Promise<PosterFonts> {
  fontsPromise ??= resolveFonts();
  return fontsPromise;
}

async function resolveFonts(): Promise<PosterFonts> {
  const root = getComputedStyle(document.documentElement);
  const serif = root.getPropertyValue("--font-ds-serif").trim();
  const mono = root.getPropertyValue("--mono").trim();
  const sans = getComputedStyle(document.body).fontFamily.trim();

  const fonts: PosterFonts = {
    serif: serif ? `${serif}, Georgia, serif` : "Georgia, serif",
    sans: sans ? `${sans}, system-ui, sans-serif` : "system-ui, sans-serif",
    mono: mono || "ui-monospace, Menlo, monospace",
  };

  try {
    await Promise.race([
      Promise.all([
        document.fonts.load(`italic 72px ${fonts.serif}`),
        document.fonts.load(`800 100px ${fonts.sans}`),
      ]),
      new Promise((resolve) => window.setTimeout(resolve, 2500)),
    ]);
  } catch {
    /* An unparseable family list or a blocked font: draw with fallbacks. */
  }
  return fonts;
}

/* ------------------------------------------------------------------- text */

type TrackingCtx = CanvasRenderingContext2D & { letterSpacing?: string };

/* Canvas letter-spacing is recent (2023 in every engine). Where it's missing
   the text is simply drawn untracked, except the eyebrow, which is spaced by
   hand because its wide tracking is the whole look. */
const hasTracking = (ctx: CanvasRenderingContext2D) => "letterSpacing" in ctx;

function track(ctx: CanvasRenderingContext2D, px: number) {
  if (hasTracking(ctx)) (ctx as TrackingCtx).letterSpacing = `${px}px`;
}

/** Greedy word wrap; a single word wider than the line breaks by character. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (ctx.measureText(word).width <= maxWidth) {
      line = word;
      continue;
    }
    let chunk = "";
    for (const ch of Array.from(word)) {
      if (chunk && ctx.measureText(chunk + ch).width > maxWidth) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    line = chunk;
  }
  if (line) lines.push(line);
  return lines;
}

/** `text` ending in "…", shortened until it fits `maxWidth`. */
function withEllipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  let chars = Array.from(text);
  while (chars.length && ctx.measureText(`${chars.join("").trimEnd()}…`).width > maxWidth) chars = chars.slice(0, -1);
  return `${chars.join("").trimEnd()}…`;
}

/** Keeps the first `max` lines, ending the last with "…" if anything was cut. */
function clampLines(ctx: CanvasRenderingContext2D, lines: string[], max: number, maxWidth: number): string[] {
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  kept[max - 1] = withEllipsis(ctx, kept[max - 1], maxWidth);
  return kept;
}

/** "https://embarko.ai/showcase/x" → "embarko.ai/showcase/x". */
export function posterAddress(pageUrl: string): string {
  try {
    const u = new URL(pageUrl);
    return `${u.host}${u.pathname}`;
  } catch {
    return pageUrl.replace(/^https?:\/\//, "");
  }
}

/* ------------------------------------------------------------------- draw */

/**
 * Everything on the poster except the QR modules, in poster pixels. The
 * caller sets any scale on `ctx` first. Returns where the QR card sits so
 * the modules can be drawn into it — on the same canvas or another layer.
 */
export function drawPoster(ctx: CanvasRenderingContext2D, input: PosterInput, fonts: PosterFonts): PosterLayout {
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // 1. Eyebrow.
  ctx.font = `600 30px ${fonts.sans}`;
  ctx.fillStyle = SOFT;
  const eyebrow = "EMBARKO SHOWCASE";
  const eyebrowTracking = 30 * 0.16;
  if (hasTracking(ctx)) {
    track(ctx, eyebrowTracking);
    ctx.fillText(eyebrow, SIDE, SIDE);
    track(ctx, 0);
  } else {
    let x = SIDE;
    for (const ch of eyebrow) {
      ctx.fillText(ch, x, SIDE);
      x += ctx.measureText(ch).width + eyebrowTracking;
    }
  }

  // 2. Title: the largest size, stepping down, that fits in three lines.
  const title = input.title.trim();
  const titleText = title || "Your event name";
  let size = TITLE_MAX;
  let lines: string[] = [];
  for (; size >= TITLE_MIN; size -= TITLE_STEP) {
    ctx.font = `800 ${size}px ${fonts.sans}`;
    track(ctx, -0.02 * size);
    lines = wrap(ctx, titleText, TEXT_W);
    if (lines.length <= TITLE_LINES) break;
  }
  if (size < TITLE_MIN) {
    size = TITLE_MIN;
    ctx.font = `800 ${size}px ${fonts.sans}`;
    track(ctx, -0.02 * size);
    lines = clampLines(ctx, wrap(ctx, titleText, TEXT_W), TITLE_LINES, TEXT_W);
  }
  ctx.fillStyle = title ? INK : FAINT;
  const titleLead = size * 1.05;
  lines.forEach((line, i) => ctx.fillText(line, SIDE, TITLE_TOP + i * titleLead));
  track(ctx, 0);
  let textBottom = TITLE_TOP + lines.length * titleLead;

  // 3. Intro, only if there is one — never filler.
  const intro = input.intro?.trim();
  if (intro) {
    ctx.font = `400 ${INTRO_SIZE}px ${fonts.sans}`;
    ctx.fillStyle = SOFT;
    const introLead = INTRO_SIZE * 1.4;
    const introTop = textBottom + INTRO_GAP;
    const introLines = clampLines(ctx, wrap(ctx, intro, INTRO_W), INTRO_LINES, INTRO_W);
    introLines.forEach((line, i) => ctx.fillText(line, SIDE, introTop + i * introLead));
    textBottom = introTop + introLines.length * introLead;
  }

  // 4. QR card, centred. It gives up a little size before it crowds the footer.
  const cardTop = Math.max(CARD_TOP_MIN, Math.round(textBottom + CARD_GAP));
  const cardSize = Math.max(CARD_MIN, Math.min(CARD_MAX, CARD_BOTTOM_MAX - cardTop));
  const card = { x: Math.round((POSTER_W - cardSize) / 2), y: cardTop, size: cardSize };
  ctx.fillStyle = CARD;
  ctx.fillRect(card.x, card.y, card.size, card.size);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.strokeRect(card.x + 1, card.y + 1, card.size - 2, card.size - 2);

  // 5. "Scan to see every app." — one line, two faces, one baseline. It only
  //    promises what the page gives a phone: the apps. Adding one is done
  //    from the link or the prompt, on the laptop the app was built on.
  const tagBaseline = card.y + card.size + TAG_GAP + TAG_ASCENT;
  const lead = "Scan to see every ";
  const accent = "app.";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.font = `500 60px ${fonts.sans}`;
  const leadW = ctx.measureText(lead).width;
  ctx.font = `italic 400 72px ${fonts.serif}`;
  const accentW = ctx.measureText(accent).width;
  const tagX = (POSTER_W - leadW - accentW) / 2;
  ctx.font = `500 60px ${fonts.sans}`;
  ctx.fillText(lead, tagX, tagBaseline);
  ctx.font = `italic 400 72px ${fonts.serif}`;
  ctx.fillText(accent, tagX + leadW, tagBaseline);

  // 6. The address, shrinking until it fits the measure.
  const address = posterAddress(input.pageUrl);
  let addrSize = ADDR_MAX;
  ctx.font = `400 ${addrSize}px ${fonts.mono}`;
  while (addrSize > ADDR_MIN && ctx.measureText(address).width > TEXT_W) {
    addrSize -= 2;
    ctx.font = `400 ${addrSize}px ${fonts.mono}`;
  }
  const addressLine = ctx.measureText(address).width > TEXT_W ? withEllipsis(ctx, address, TEXT_W) : address;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = input.ghost ? FAINT : SOFT;
  ctx.fillText(addressLine, POSTER_W / 2, tagBaseline + TAG_DESCENT + ADDR_GAP);

  // 7. Footer.
  ctx.textBaseline = "alphabetic";
  ctx.font = `500 ${FOOTER_SIZE}px ${fonts.sans}`;
  ctx.fillStyle = FAINT;
  ctx.fillText("Hosted on Embarko", POSTER_W / 2, FOOTER_BASELINE);

  ctx.restore();
  return { card };
}

/* The matrix at one pixel per module, so it can be scaled up with smoothing
   off and every module stays a hard-edged square at any size. */
function moduleTile(matrix: boolean[][], color: string): HTMLCanvasElement {
  const n = matrix.length;
  const tile = document.createElement("canvas");
  tile.width = n;
  tile.height = n;
  const g = tile.getContext("2d");
  if (g) {
    g.fillStyle = color;
    matrix.forEach((row, r) => row.forEach((dark, c) => dark && g.fillRect(c, r, 1, 1)));
  }
  return tile;
}

/** The QR modules, centred in the card on whole-pixel modules. */
export function drawQrModules(ctx: CanvasRenderingContext2D, matrix: boolean[][], card: PosterLayout["card"]) {
  const n = matrix.length;
  if (!n) return;
  const module = Math.floor((card.size - CARD_PAD * 2) / n);
  const qrSize = module * n;
  const x = card.x + Math.round((card.size - qrSize) / 2);
  const y = card.y + Math.round((card.size - qrSize) / 2);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(moduleTile(matrix, INK), x, y, qrSize, qrSize);
  ctx.restore();
}

/* --------------------------------------------------------------- download */

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn’t make the image."))), "image/png"),
  );
}

/** The full-size poster as a PNG. Rejects where canvas export isn't available. */
export async function posterBlob(input: PosterInput): Promise<Blob> {
  const fonts = await loadPosterFonts();
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn’t available.");
  const { card } = drawPoster(ctx, input, fonts);
  drawQrModules(ctx, qrMatrix(input.pageUrl), card);
  return toPng(canvas);
}

/**
 * Just the QR code, 1200px square: black on white with the standard
 * four-module quiet zone, for organisers who want to place it on their own
 * slides or badges.
 */
export async function qrBlob(text: string): Promise<Blob> {
  const matrix = qrMatrix(text);
  const n = matrix.length;
  const SIZE = 1200;
  const module = Math.floor(SIZE / (n + 8));
  const offset = Math.floor((SIZE - module * n) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn’t available.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = "#000";
  matrix.forEach((row, r) =>
    row.forEach((dark, c) => dark && ctx.fillRect(offset + c * module, offset + r * module, module, module)),
  );
  return toPng(canvas);
}

/** Saves a blob under `filename` through a temporary link. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
