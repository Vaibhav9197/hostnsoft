/** The canonical "copy prompt for agent" text — shared by the landing page's
 *  hero CTA and the docs page's "Install the skill" panel so they never
 *  drift out of sync. */
export const DEPLOY_PROMPT = `Deploy this to Embarko: POST https://ship.embarko.ai/apps with
header Authorization: Bearer $DEPLOY_TOKEN, header X-App-Name: <name>,
and multipart field source=<tarball of the app>. Full docs:
https://hostnsoft.com/docs. (A helper skill exists too —
npx skills add embarko-ai/skill --skill embarko-deploy -g — but that's
optional convenience, not required; the curl call above works standalone.)`;
