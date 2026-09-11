import { requireAdmin, SignInRequired } from "../guard";
import Queries from "./queries";

/* Every customer query, whatever route it came in by — filtering happens in
   the view. Gated like every other /admin page: the API guards itself too, but
   this keeps the markup away from strangers. */
export default async function CustomerQueriesPage() {
  if (!(await requireAdmin())) return <SignInRequired />;

  return <Queries />;
}
