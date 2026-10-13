import type { Metadata } from "next";

import { superAdminAccess } from "../../lib/api";
import { loadModel } from "../../lib/system/load";
import { AccessNotice, SignInHere } from "./access";
import { SystemPage } from "./SystemPage";
import "./system.css";

/* The Live PRD: how Embarko is made, story by story. Generated from the code
   and app/lib/system/story.ts — see README.md beside this file.

   Platform admins only, the same flag as every /admin page. The data
   endpoints it calls (/api/system/*) check it again on every call. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How Embarko is made",
  robots: { index: false, follow: false },
};

export default async function SystemRoute() {
  const access = await superAdminAccess();
  if (access.state === "anon") return <SignInHere />;
  if (access.state === "removed") return <AccessNotice kind="removed" />;
  if (access.state === "denied") return <AccessNotice kind="denied" />;

  return <SystemPage model={await loadModel()} />;
}
