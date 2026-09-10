import { docMetadata, renderDoc } from "./renderDoc";

export const metadata = docMetadata("docs");

export default async function DocPage() {
  return renderDoc("docs");
}
