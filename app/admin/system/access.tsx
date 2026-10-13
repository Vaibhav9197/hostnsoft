"use client";

import Link from "next/link";
import { useEffect } from "react";

import { LoginScreen } from "../../components/console/LoginScreen";
import { SessionProvider, useSession } from "../../lib/session";

/* Signed out: sign in right here, then the page reloads itself — the person
   never leaves the address they were sent. */
export function SignInHere() {
  return (
    <SessionProvider>
      <ReloadWhenSignedIn />
    </SessionProvider>
  );
}

function ReloadWhenSignedIn() {
  const { status } = useSession();
  useEffect(() => {
    if (status === "authed") window.location.reload();
  }, [status]);
  if (status === "authed") return null;
  return <LoginScreen />;
}

export function AccessNotice({ kind }: { kind: "removed" | "denied" }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md border border-border bg-card p-6">
        <h1 className="text-xl font-semibold text-foreground">
          {kind === "removed" ? "Your access was removed" : "This page is for admins"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {kind === "removed"
            ? "Your session is no longer accepted. Sign in again, or ask a platform admin to restore your account."
            : "It shows how Embarko is built, and only platform admins can open it."}
        </p>
        <Link href="/app" className="mt-5 inline-block font-medium text-foreground underline underline-offset-4">
          Back to your apps
        </Link>
      </div>
    </div>
  );
}
