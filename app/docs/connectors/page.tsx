import { docMetadata, renderDoc } from "../renderDoc";

export const metadata = docMetadata("connectors");

export default function ConnectorsPage() {
  return renderDoc("connectors");
}
