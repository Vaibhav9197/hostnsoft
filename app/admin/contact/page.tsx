import { requireAdmin, SignInRequired } from "../guard";
import Messages from "./messages";

/* Contact messages carry other people's email addresses, so this page is gated
   the same way /admin is — and /api/contact/list refuses anonymous callers on
   its own, so the data stays protected even when requested directly. */
export default async function ContactAdminPage() {
  if (!(await requireAdmin())) return <SignInRequired />;

  return <Messages />;
}
