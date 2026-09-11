import { docMetadata, renderDoc } from "../docs/renderDoc";

export const metadata = docMetadata("troubleshoot");

export default async function TroubleshootPage() {
  return renderDoc("troubleshoot");
}
