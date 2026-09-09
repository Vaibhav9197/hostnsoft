import { requireAdmin, SignInRequired } from "../guard";
import Apps from "./apps";

/* Platform-wide app list — other companies' data, so gated like every other
   /admin page. The API refuses non-admins on its own too. */
export default async function AdminAppsPage() {
  if (!(await requireAdmin())) return <SignInRequired />;

  return <Apps />;
}
