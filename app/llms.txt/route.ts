import { llmsTxt } from "../lib/guide/discovery";
import { discoveryResponse, TEXT_TYPE } from "../lib/guide/respond";
import { SITE } from "../lib/site";

/* The map for agents (llmstxt.org): one line per guide topic, built from the
   guide itself so it can never name a page that is not there. */
/* Built from the bundled guide: nothing per request. */
export const dynamic = "force-static";

export function GET() {
  return discoveryResponse(llmsTxt(SITE), TEXT_TYPE);
}
