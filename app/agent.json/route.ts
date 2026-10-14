import { agentJson } from "@/app/lib/guide/discovery";
import { discoveryResponse, JSON_TYPE } from "@/app/lib/guide/respond";
import { SITE } from "@/app/lib/site";

/* Same manifest as /.well-known/agent.json: agents look in all three places. */
/* Built from the bundled guide: nothing per request. */
export const dynamic = "force-static";

export function GET() {
  return discoveryResponse(agentJson(SITE), JSON_TYPE);
}
