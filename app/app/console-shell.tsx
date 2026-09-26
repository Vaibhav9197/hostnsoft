"use client";

import { LoginScreen } from "../components/console/LoginScreen";
import { FeedbackWidget } from "../components/console/FeedbackWidget";
import { HeaderHomeButton } from "../components/console/HeaderHomeButton";
import { HeaderPlanBadge } from "../components/console/HeaderPlanBadge";
import { HeaderTokenButton } from "../components/console/HeaderTokenButton";
import { HeaderUserMenu } from "../components/console/HeaderUserMenu";
import { Alert } from "../components/console/kit";
import { SessionSignals } from "../components/analytics/SessionSignals";
import { Toaster } from "../components/ui/sonner";
import { BillingProvider } from "../lib/billing";
import { SessionProvider, useSession } from "../lib/session";
import { ThemeProvider } from "../lib/theme";

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <SessionSignals />
        <BillingProvider>
          <Shell>{children}</Shell>
          {/* Inside ThemeProvider so toasts follow the console's own light/dark
              choice, and outside Shell so one is never unmounted mid-flight by
              the navigation that a save triggers. */}
          {/* Below 600px Sonner spans the full width of the bottom edge, right
              over the feedback launcher (bottom-4, h-12), so lift it clear. */}
          <Toaster mobileOffset={{ bottom: 80 }} />
        </BillingProvider>
      </SessionProvider>
    </ThemeProvider>
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
        {/* Navigation sits on the left, next to the account it belongs to; the
            right edge is for the plan chip. */}
        <HeaderUserMenu />
        <HeaderHomeButton />
        <HeaderTokenButton />
        <div className="ml-auto flex items-center gap-2">
          <HeaderPlanBadge />
        </div>
      </header>
      <main className="flex-1">
        {/* Extra bottom padding keeps the last row clear of the feedback launcher. */}
        <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-8">
          {!apiConnected && (
            <Alert variant="warn" className="mb-6">
              You're signed in, but the Embarko API service is unreachable right now — company and
              app data can't be loaded until it's back.
            </Alert>
          )}
          {children}
        </div>
      </main>
      <FeedbackWidget />
    </div>
  );
}
