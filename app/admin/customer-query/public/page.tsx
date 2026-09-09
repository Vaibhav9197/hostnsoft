import { requireAdmin, SignInRequired } from "../../guard";
import Queries from "../queries";

/* Queries from anonymous visitors. These carry an email address someone typed
   into a public form, so the same gate applies. */
export default async function PublicQueriesPage() {
  if (!(await requireAdmin())) return <SignInRequired />;

  return <Queries source="public" />;
}
