import { cookies } from "next/headers";
import { ConsoleShell } from "./console-shell";

// Server component so we can read the sidebar cookie before the first paint.
// SidebarProvider only *writes* sidebar_state; it never reads it back, so the
// remembered state has to be handed to it as defaultOpen from here.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const sidebarState = (await cookies()).get("sidebar_state")?.value;

  return (
    <ConsoleShell defaultSidebarOpen={sidebarState !== "false"}>
      {children}
    </ConsoleShell>
  );
}
