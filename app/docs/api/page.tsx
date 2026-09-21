import { docMetadata, renderDoc } from "../renderDoc";

export const metadata = docMetadata("api");

export default function ApiPage() {
  return renderDoc("api");
}
