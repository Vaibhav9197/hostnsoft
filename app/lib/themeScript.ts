/* Applied before the first paint, so the console never flashes light on its
   way to dark. It has to be inline and synchronous: anything that waits for
   hydration paints the wrong theme first. The OS is the only input — there is
   no stored preference to read since the theme picker went away — and it
   writes the same attribute ThemeProvider maintains from then on.

   Shared by the console layout (app/app) and the claim page (app/claim), which
   is the console's sign-in put on a page of its own. */
export const THEME_SCRIPT = `(function(){try{
document.documentElement.setAttribute("data-theme",
  window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
}catch(e){}})();`;
