import { agentCard } from "../../lib/guide/discovery";
import { discoveryResponse, JSON_TYPE } from "../../lib/guide/respond";
import { SITE } from "../../lib/site";

/* The A2A agent card: Embarko's skills, for agents that discover others this way. */
/* Built from the bundled guide: nothing per request. */
export const dynamic = "force-static";

export function GET() {
  return discoveryResponse(agentCard(SITE), JSON_TYPE);
}
