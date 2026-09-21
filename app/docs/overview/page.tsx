import { docMetadata, renderDoc } from "../renderDoc";

export const metadata = docMetadata("overview");

export default function OverviewPage() {
  return renderDoc("overview");
}
