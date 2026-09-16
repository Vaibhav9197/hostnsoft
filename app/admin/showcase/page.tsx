import { requireAdmin, SignInRequired } from "../guard";
import Submissions from "./submissions";

/* Showcase oversight. Gated like every /admin page; the API guards itself too. */
export default async function ShowcaseAdminPage() {
  if (!(await requireAdmin())) return <SignInRequired />;

  return <Submissions />;
}
