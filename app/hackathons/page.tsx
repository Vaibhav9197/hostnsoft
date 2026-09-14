import { docMetadata, renderDoc } from "../docs/renderDoc";

export const metadata = docMetadata("hackathons");

export default async function HackathonsPage() {
  return renderDoc("hackathons");
}
