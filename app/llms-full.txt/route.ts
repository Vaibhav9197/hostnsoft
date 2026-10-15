import { fullPointer } from "../lib/guide/markdown";
import { discoveryResponse, TEXT_TYPE } from "../lib/guide/respond";
import { SITE } from "../lib/site";

/* A pointer, not the whole guide: agents that fetched everything paid ~14k
   tokens and their fetch tools summarised it anyway. One topic at a time is
   cheaper and keeps the exact wording. */
/* Built from the bundled guide: nothing per request. */
export const dynamic = "force-static";

export function GET() {
  return discoveryResponse(fullPointer(SITE), TEXT_TYPE);
}
