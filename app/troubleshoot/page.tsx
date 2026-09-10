import { docMetadata, renderDoc } from "../doc/renderDoc";

export const metadata = docMetadata("troubleshoot");

export default async function TroubleshootPage() {
  return renderDoc("troubleshoot");
}
