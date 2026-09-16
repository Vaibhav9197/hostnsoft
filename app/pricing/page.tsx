import { listPublicPlans } from "../lib/publicApi";
import { PricingPageClient } from "./PricingPageClient";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const plans = await listPublicPlans();
  return <PricingPageClient plans={plans} />;
}
