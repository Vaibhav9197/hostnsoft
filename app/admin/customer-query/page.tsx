import { requireAdmin, SignInRequired } from "../guard";
import Queries from "./queries";

/* Queries raised from inside the console. Gated like every other /admin page —
   the API guards itself too, but this keeps the markup away from strangers. */
export default async function DashboardQueriesPage() {
  if (!(await requireAdmin())) return <SignInRequired />;

  return <Queries source="dashboard" />;
}
