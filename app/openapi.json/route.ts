import { openapi } from "../lib/guide/discovery";
import { discoveryResponse, JSON_TYPE } from "../lib/guide/respond";

/* OpenAPI 3.1 for the deploy API at ship.embarko.ai. */
/* Built from the bundled guide: nothing per request. */
export const dynamic = "force-static";

export function GET() {
  return discoveryResponse(openapi(), JSON_TYPE);
}
