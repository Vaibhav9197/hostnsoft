import { requireAdmin, SignInRequired } from "../guard";
import Submissions from "./submissions";

/* The Showcase review queue. Gated like every other /admin page; the API guards
   itself as well, since it can be requested directly. */
export default async function ShowcaseAdminPage() {
  if (!(await requireAdmin())) return <SignInRequired />;

  return <Submissions />;
}
