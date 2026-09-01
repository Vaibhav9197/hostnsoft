import { cookies, headers } from "next/headers";
import { recordHeroEvent } from "@/app/lib/heroDb";
import {
  HERO_VARIANT_COOKIE,
  HERO_VISITOR_COOKIE,
  isHeroVariant,
} from "@/app/lib/heroVariants";

export const runtime = "nodejs";

const ALLOWED_EVENTS = new Set(["hero_impression", "hero_cta_click"]);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body.event !== "string" || !ALLOWED_EVENTS.has(body.event)) {
      return Response.json({ success: false, error: "Unknown event" }, { status: 400 });
    }

    const [cookieStore, hdrs] = await Promise.all([cookies(), headers()]);

    // The rendered variant is what the visitor actually saw, so prefer it;
    // fall back to the cookie if the payload is missing or malformed.
    const cookieVariant = cookieStore.get(HERO_VARIANT_COOKIE)?.value;
    const variant = isHeroVariant(body.variant)
      ? body.variant
      : isHeroVariant(cookieVariant)
        ? cookieVariant
        : null;

    const visitorId = cookieStore.get(HERO_VISITOR_COOKIE)?.value;

    if (!variant || !visitorId) {
      return Response.json({ success: false, error: "Unassigned visitor" }, { status: 400 });
    }

    await recordHeroEvent({
      visitorId,
      variant,
      event: body.event,
      url: typeof body.url === "string" ? body.url : null,
      userAgent: hdrs.get("user-agent"),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to track hero event:", error);
    return Response.json({ success: false, error: "Tracking failed" }, { status: 500 });
  }
}
