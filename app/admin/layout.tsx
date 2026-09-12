import { ThemeProvider } from "../lib/theme";

/* Same theme script and provider as the console layout, reading the same
   localStorage key — so the choice a platform admin makes in one panel is the
   one they get in the other, and /admin never lands in the opposite theme. */
const THEME_SCRIPT = `(function(){try{
var p=localStorage.getItem("embarko-theme");
if(p!=="light"&&p!=="dark")p=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
document.documentElement.setAttribute("data-theme",p);
}catch(e){}})();`;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <ThemeProvider>{children}</ThemeProvider>
    </>
  );
}
