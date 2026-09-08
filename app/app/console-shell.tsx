"use client";

import { LoginScreen } from "../components/console/LoginScreen";
import { HeaderHomeButton } from "../components/console/HeaderHomeButton";
import { HeaderPlanBadge } from "../components/console/HeaderPlanBadge";
import { HeaderTokenButton } from "../components/console/HeaderTokenButton";
import { HeaderUserMenu } from "../components/console/HeaderUserMenu";
import { Alert } from "../components/console/kit";
import { SessionSignals } from "../components/analytics/SessionSignals";
import { BillingProvider } from "../lib/billing";
import { SessionProvider, useSession } from "../lib/session";

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionSignals />
      <BillingProvider>
        <Shell>{children}</Shell>
      </BillingProvider>
    </SessionProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { status, apiConnected, companies } = useSession();
  const hasNoCompanies = companies.length === 0;

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3.5 bg-background" role="status" aria-live="polite">
        <span className="size-6 animate-spin rounded-full border-2 border-input border-t-primary" aria-hidden="true" />
        <span className="font-mono text-[0.78rem] text-faint">Loading your workspace…</span>
      </div>
    );
  }

  if (status === "anon") return <LoginScreen />;

  if (hasNoCompanies) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center border-b px-4 sm:px-8">
          <HeaderUserMenu />
        </header>
        <div className="flex flex-1 items-center justify-center">
          <main className="w-full max-w-5xl px-8 py-8">
            {!apiConnected && (
              <Alert variant="warn" className="mb-6">
                You're signed in, but the Embarko API service is unreachable right now — company and
                app data can't be loaded until it's back.
              </Alert>
            )}
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-2 sm:px-4">
        {/* All navigation lives in this menu now — the left sidebar is gone. */}
        <HeaderUserMenu />
        <div className="ml-auto flex items-center gap-2">
          <HeaderHomeButton />
          <HeaderTokenButton />
          <HeaderPlanBadge />
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
          {!apiConnected && (
            <Alert variant="warn" className="mb-6">
              You're signed in, but the Embarko API service is unreachable right now — company and
              app data can't be loaded until it's back.
            </Alert>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
