import type { Metadata } from "next";
import { listPublicPlans } from "../lib/publicApi";
import { PricingPageClient } from "./PricingPageClient";

export const metadata: Metadata = {
  title: "Pricing",
  keywords: ["Embarko pricing","AI app hosting price","free app hosting","hosting plans for AI built apps","deploy app free"],
  description:
    "Start hosting for free. Embarko plans scale with the apps your AI builds — every plan includes a live URL, a database and persistent storage.",
};

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const plans = await listPublicPlans();
  return <PricingPageClient plans={plans} />;
}
