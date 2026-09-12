/* Shared gate for the /admin pages.
 *
 * Each admin route is its own page, so a guard on one does not cover the rest —
 * /admin/contact was reachable while /admin was locked. Routing every admin
 * page through requireAdmin() keeps that from drifting again as pages are
 * added: a new page either calls it, or it is obvious in review that it didn't.
 *
 * The matching API routes guard themselves as well. This is deliberate — the
 * page check keeps the markup away from anyone who isn't an admin, and the API
 * check is what actually protects the data, since an endpoint can be requested
 * directly.
 *
 * The Admin entry in the console's account menu is hidden for non-admins, but
 * that is only presentation: /admin can be typed in. This is the check that
 * decides.
 */
import { currentSuperAdmin } from "../lib/api";

export function SignInRequired() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-bold">Not available</h1>
        <p className="mt-2 text-muted-foreground">
          This page shows internal data and is limited to platform administrators. If you should have
          access, sign in with an account that has it.
        </p>
      </div>
    </div>
  );
}

// Resolves the signed-in platform admin, or null when the caller should be
// shown <SignInRequired /> instead of the page.
//
// This used to accept any signed-in user: it returned currentUser(), whose
// ADMIN_EMAILS allowlist only applies when that variable is set, and it isn't
// set in this project. Every logged-in account was getting the admin shell.
// Now the isSuperAdmin flag from hostnsoft-api is required.
export async function requireAdmin() {
  return currentSuperAdmin();
}
