import type { Metadata } from "next";
import { renderHackathons } from "../docs/renderDoc";

export const metadata: Metadata = {
  title: "Hackathons",
  description: "Free Embarko Pro for every participant, and a Showcase page for your event.",
  keywords: ["hackathon hosting", "free hosting for hackathon", "Embarko Pro hackathon", "deploy hackathon project"],
};

export default function HackathonsPage() {
  return renderHackathons();
}
