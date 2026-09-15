import { requireAdmin, SignInRequired } from "../guard";
import SuperAdmins from "./super-admins";

/* Who else can reach /admin. Gated like every other admin page — and this one
 * is also the page that hands out that access, so the upstream endpoints check
 * again on their own.
 *
 * The client needs no identity prop: each row the list returns carries its own
 * isSelf, resolved upstream against the same session. */
export default async function AdminSuperAdminsPage() {
  if (!(await requireAdmin())) return <SignInRequired />;

  return <SuperAdmins />;
}
