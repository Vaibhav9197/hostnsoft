import { readHeroStats } from "@/app/lib/heroDb";

export const runtime = "nodejs";

/** Local read-out of the running test: GET /api/hero/stats */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not available in production" }, { status: 404 });
  }

  const stats = await readHeroStats();

  if (!stats) {
    return Response.json({ error: "Local SQLite store is unavailable" }, { status: 503 });
  }

  const totals = stats.reduce(
    (acc, s) => ({
      visitors: acc.visitors + s.visitors,
      impressions: acc.impressions + s.impressions,
      ctaClicks: acc.ctaClicks + s.ctaClicks,
    }),
    { visitors: 0, impressions: 0, ctaClicks: 0 }
  );

  return Response.json({ variants: stats, totals });
}
