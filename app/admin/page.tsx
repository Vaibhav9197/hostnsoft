import { requireAdmin, SignInRequired } from "./guard";
import Dashboard from "./dashboard";

/* Internal analytics — which landing page is winning, and how well each one
   converts. /api/metrics already refuses anonymous callers, but that alone
   leaves the page itself public: a stranger still gets the dashboard shell and
   learns this endpoint exists. Resolving the session here instead means an
   unauthenticated visitor is handed the notice below and nothing else.

   The same login session as the console (hns_pat), so whoever is signed in
   there is already signed in here. */
export default async function AdminPage() {
  if (!(await requireAdmin())) return <SignInRequired />;

  return <Dashboard />;
}
