import { agentJson } from "../../lib/guide/discovery";
import { discoveryResponse, JSON_TYPE } from "../../lib/guide/respond";
import { SITE } from "../../lib/site";

/* What Embarko is and how an agent uses it, in one manifest. Also served at
   /.well-known/agent and /agent.json, the other places agents look. */
/* Built from the bundled guide: nothing per request. */
export const dynamic = "force-static";

export function GET() {
  return discoveryResponse(agentJson(SITE), JSON_TYPE);
}
