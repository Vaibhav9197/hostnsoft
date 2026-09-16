import { docMetadata, renderDoc } from "../docs/renderDoc";

export const metadata = docMetadata("hackathons");

export default function HackathonsPage() {
  return renderDoc("hackathons");
}
