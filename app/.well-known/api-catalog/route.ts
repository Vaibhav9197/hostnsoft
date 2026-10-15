import { apiCatalog } from "../../lib/guide/discovery";
import { discoveryResponse } from "../../lib/guide/respond";
import { SITE } from "../../lib/site";

/* RFC 9727: where the API, its OpenAPI description and its docs are. */
/* Built from the bundled guide: nothing per request. */
export const dynamic = "force-static";

export function GET() {
  return discoveryResponse(apiCatalog(SITE), "application/linkset+json; charset=utf-8");
}
