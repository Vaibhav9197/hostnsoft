import { currentUser } from "../lib/api";
import Dashboard from "./dashboard";

/* Internal analytics — which landing page is winning, and how well each one
   converts. /api/metrics already refuses anonymous callers, but that alone
   leaves the page itself public: a stranger still gets the dashboard shell and
   learns this endpoint exists. Resolving the session here instead means an
   unauthenticated visitor is handed the notice below and nothing else.

   The same login session as the console (hns_pat), so whoever is signed in
   there is already signed in here. */
export default async function AdminPage() {
  const user = await currentUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-6">
          <h1 className="text-xl font-bold">Sign in required</h1>
          <p className="mt-2 text-gray-600">
            This dashboard shows internal performance data. Sign in with an account that has
            access to view it.
          </p>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}
