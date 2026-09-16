import { docMetadata, renderDoc } from "./renderDoc";

export const metadata = docMetadata("docs");

export default function DocPage() {
  return renderDoc("docs");
}
