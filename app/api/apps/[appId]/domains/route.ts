import { NextResponse } from "next/server";
import { getApp, listDomains } from "../../../../lib/dummy";

// GET /api/apps/:appId/domains — the default URL plus any custom domains.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;
  if (!getApp(appId)) return NextResponse.json({ error: "App not found" }, { status: 404 });
  return NextResponse.json({ domains: listDomains(appId) });
}

// POST /api/apps/:appId/domains — attach a custom domain.
// Body: { hostname }. Returns the CNAME target to point at. Dummy for now.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;
  const app = getApp(appId);
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const hostname = typeof body?.hostname === "string" ? body.hostname.trim().toLowerCase() : "";
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(hostname)) {
    return NextResponse.json({ error: "Enter a valid domain, e.g. app.yourbusiness.com" }, { status: 400 });
  }
  const cnameTarget = (app.url ?? "").replace(/^https?:\/\//, "") || `${app.name}.hostnsoft.com`;
  return NextResponse.json({
    domain: {
      id: `dom_${hostname.replace(/[^a-z0-9]/g, "").slice(0, 10)}`,
      hostname,
      primary: false,
      status: "pending",
      cnameTarget,
      createdAt: new Date().toISOString(),
    },
    message: `Add a CNAME record for ${hostname} → ${cnameTarget}, then verification completes automatically.`,
  });
}

// DELETE /api/apps/:appId/domains — remove a custom domain. Body: { hostname }.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;
  if (!getApp(appId)) return NextResponse.json({ error: "App not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const hostname = typeof body?.hostname === "string" ? body.hostname : "";
  return NextResponse.json({ ok: true, message: `${hostname} removed.` });
}
