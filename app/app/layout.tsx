import { ConsoleShell } from "./console-shell";

/* Applied before the first paint, so the console never flashes light on its
   way to dark. It has to be inline and synchronous: anything that waits for
   hydration paints the wrong theme first. Kept deliberately tiny — it reads the
   stored preference, resolves "system" against the OS, and writes the same
   attribute ThemeProvider maintains from then on. */
const THEME_SCRIPT = `(function(){try{
var p=localStorage.getItem("embarko-theme");
if(p!=="light"&&p!=="dark")p=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
document.documentElement.setAttribute("data-theme",p);
}catch(e){}})();`;

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <ConsoleShell>{children}</ConsoleShell>
    </>
  );
}
