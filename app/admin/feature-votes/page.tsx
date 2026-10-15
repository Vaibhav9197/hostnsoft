import { requireAdmin, SignInRequired } from "../guard";
import Votes from "./votes";

/* Which upcoming features customers want most. Gated like every other /admin
   page; the summary API guards itself as well. */
export default async function FeatureVotesPage() {
  if (!(await requireAdmin())) return <SignInRequired />;

  return <Votes />;
}
