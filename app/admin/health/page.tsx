import { requireAdmin, SignInRequired } from "../guard";
import Health from "./health";

/* Platform health and growth, from the monitoring tables. Gated like every
   other /admin page; /api/monitor/* checks again on its own. */
export default async function AdminHealthPage() {
  if (!(await requireAdmin())) return <SignInRequired />;

  return <Health />;
}
