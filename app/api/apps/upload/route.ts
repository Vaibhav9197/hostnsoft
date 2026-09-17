import type { NextRequest } from "next/server";
import { uploadToDeploy } from "../../../lib/api";

// POST /api/apps/upload — deploy an app from a file the browser packed.
//
// The archive can't be posted straight to the deploy endpoint from the page:
// the session is an httpOnly cookie, so only the server can read the PAT the
// upload has to be signed with. That's the same reason /api/apps/[slug]/logs
// exists — the deploy routes sit at the origin root rather than under the
// management API, so the generic /api/hns proxy can't reach them either.

export const runtime = "nodejs";

/** Matches the packer's own ceiling, enforced again here because a limit the
 *  browser applies is a courtesy, not a control. */
const MAX_BYTES = 100 * 1024 * 1024;

/** What the deploy endpoint accepts as an app name. */
const APP_NAME = /^[a-z0-9][a-z0-9-]*$/;

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return Response.json({ error: "Expected an uploaded file." }, { status: 400 });
  }

  const source = form.get("source");
  const appName = String(form.get("appName") ?? "");
  const companyId = String(form.get("companyId") ?? "");
  const appVersion = String(form.get("appVersion") ?? "");

  if (!(source instanceof Blob) || source.size === 0) {
    return Response.json({ error: "That upload had no file in it." }, { status: 400 });
  }
  if (source.size > MAX_BYTES) {
    return Response.json(
      { error: "That app is too big to upload — 100 MB is the limit." },
      { status: 413 },
    );
  }
  if (!APP_NAME.test(appName)) {
    return Response.json(
      { error: "An app name can only use lowercase letters, numbers and dashes." },
      { status: 400 },
    );
  }
  /* Required by the deploy endpoint, not optional here: a PAT isn't scoped to
     one company, so without this the upload can't say where the app belongs. */
  if (!companyId) {
    return Response.json({ error: "No company selected." }, { status: 400 });
  }

  return uploadToDeploy({
    source,
    fileName: `${appName}.tar.gz`,
    appName,
    companyId,
    appVersion: appVersion || undefined,
  });
}
