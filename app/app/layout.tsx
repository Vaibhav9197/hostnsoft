import { THEME_SCRIPT } from "../lib/themeScript";
import { ConsoleShell } from "./console-shell";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <ConsoleShell>{children}</ConsoleShell>
    </>
  );
}
