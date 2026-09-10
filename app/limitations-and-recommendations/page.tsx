import { docMetadata, renderDoc } from "../doc/renderDoc";

export const metadata = docMetadata("limitations-and-recommendations");

export default async function LimitationsPage() {
  return renderDoc("limitations-and-recommendations");
}
