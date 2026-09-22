import { ThemeProvider } from "../lib/theme";

/* Same theme script and provider as the console layout — both follow the OS,
   so /admin never lands in the opposite theme to the panel it was opened
   from. */
const THEME_SCRIPT = `(function(){try{
document.documentElement.setAttribute("data-theme",
  window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
}catch(e){}})();`;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <ThemeProvider>{children}</ThemeProvider>
    </>
  );
}
