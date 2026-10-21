/**
 * The agent guide: every topic, in the order an agent meets it.
 *
 * This file is the only place the guide's content lives. markdown.js renders
 * it as Markdown and JSON for agents, app/docs renders that Markdown as HTML
 * for people, and discovery.js builds llms.txt, OpenAPI and the .well-known
 * files from it, so none of them can say something this file doesn't.
 *
 * `base` is the host serving the guide, so links between topics stay on it.
 * Real Embarko actions (deploy, status, env vars...) always use full
 * ship.embarko.ai URLs, written into the steps themselves: an agent should
 * never have to look a URL up elsewhere on the page.
 *
 * Shell commands use single quotes only, so they survive being embedded in
 * JSON without escaped double quotes. Each one lives in its own `command`
 * field; the .md version shows it as a code block.
 */

const SHIP = 'https://ship.embarko.ai';
const API = `${SHIP}/api`;
const SITE = 'https://embarko.ai';

const VERSION = '2026-10-21';

const SECTIONS = [
  { n: 1, id: 'start', name: 'Start', blurb: 'What Embarko is, how to reply to the person, and connecting Embarko to their AI tool.' },
  { n: 2, id: 'quickstart', name: 'Quickstart', blurb: 'The shortest path from "I have an app" to a live link.' },
  { n: 3, id: 'deploy', name: 'Deploy', blurb: 'Putting an app online, and what it needs to run.' },
  { n: 4, id: 'claim', name: 'Claim', blurb: 'Making a temporary app permanent.' },
  { n: 5, id: 'manage', name: 'Manage', blurb: 'Status, logs, secrets, domains, rollback and the rest, once it is live.' },
  { n: 6, id: 'showcase', name: 'Showcase', blurb: 'Listing the app in the public gallery or on an event page.' },
  { n: 7, id: 'feedback', name: 'Feedback', blurb: 'Reporting a problem or asking for a feature.' },
];

const SAY = ['Live', 'Open app', 'Deploy', 'Update', 'Needs attention', 'Fix with your AI'];
const AVOID = ['Provision', 'Runtime', 'Container', 'Build log', 'Endpoint', 'Deployment artifact', 'Infrastructure', 'Resource allocation', 'HTTP status codes'];

const TALK_RULE = 'Reply in 1-3 short plain sentences: what happened, and what the person needs to do only if something is needed. Do not show commands, API names, tokens, headers or logs, or describe the steps you took, unless the person asks for technical details. If the person is clearly a developer (uses technical terms, asks what you ran), talk to them that way for the rest of the conversation. Never show a token. Never invent a link, name or code: use only what Embarko\'s replies, this guide or the person give you.';

const EXAMPLES = {
  deploying: "Your app is deploying now. I'll tell you when it's live.",
  live: 'Your app is live: {link}. It stays online until {time}; want me to keep it permanently?',
  live_owned: 'Your app is live: {link}.',
  still_building: 'Still building. Nothing needed from you.',
  failed: "It didn't go live because of a problem in the code. I'm fixing it now.",
  needs_user: 'I need one thing from you: {plain explanation}.',
  missing_secrets: 'Your app needs a key before it can work. Add it here: {secrets page link}',
  connect_once: 'Connect Embarko to {your AI tool} once ({link}), then ask me again. After that I can deploy for you directly.',
  no_permission: "Your role in this workspace ({role}) doesn't allow me to {what it was}. An Owner or Admin can change that on the Members page: https://embarko.ai/app/members",
};

// Every host an agent may need, so it (or the person) can allowlist them
// together. .ai and .app are both Embarko.
const DOMAINS = [
  { host: 'ship.embarko.ai', why: 'The API: deploy, status, logs and every management call.' },
  { host: 'embarko.ai', why: 'The website: human docs, sign-in, the dashboard, deploy tokens, Showcase pages.' },
  { host: '{app-name}.embarko.app', why: 'Where each deployed app is served. Open it to check the app works.' },
  { host: 'raw.githubusercontent.com / github.com', why: 'Only for the optional skill and its deploy script (github.com/embarko-ai/skill).' },
];

// What each route accepts as the app's source.
const SOURCE_FORMATS = {
  connector: 'deploy_app takes the files themselves: [{ path, content, encoding? }]. Text as-is, binaries as base64.',
  http_multipart: 'A .tar.gz of the app folder in the "source" form field. Not .zip.',
  http_json: 'The same files list as the connector, as a JSON body.',
  upload_page: 'A folder or a .zip (a .tar.gz also works). The browser packs it.',
};

// Status class → what to do. Same rules everywhere.
// One retry rule for every call. The Retry column in every errors table uses
// these four words and nothing else.
const RETRY = [
  { status: '400, 401, 403, 404, 409, 422', retry: 'No', do: 'The request is wrong. Fix what `code` names, then send a different request.' },
  { status: '500, 502, 503, 504', retry: 'Once', do: 'Wait 2 seconds and retry once. For a deploy, check status first: it may have been accepted. Where a specific code below says otherwise (app_name_check_failed), that row wins.' },
  { status: '429, or a code that says wait', retry: 'Later', do: 'Wait retryAfterMs if the reply gives it, otherwise a few minutes, then retry once.' },
  { status: 'Timeout / no reply on a deploy', retry: 'Check first', do: 'Call status before retrying, or you may deploy twice.' },
];
const BACKOFF = 'A code\'s own row always beats these general rules. Sending a corrected request (new name, new folder, fixed code) is a new request, not a retry. Never more than one retry, never in a loop. If the retry fails too, stop and tell the person, and report it if it looks like Embarko\'s fault.';

// A few reserved app names as examples. The full list is not published:
// it names parts of the platform, and an agent only needs the 409 to react.
const RESERVED_EXAMPLES = ['www', 'api', 'app', 'admin', 'docs', 'help', 'support', 'login', 'mail', 'status', 'pricing', 'showcase', 'embarko'];

const ROUTES = [
  {
    order: 1,
    route: 'connector',
    use_when: 'An Embarko connector is in your tools (deploy_app, read_app, update_app, app_danger_zone).',
    why: 'Runs outside your sandbox, needs no token, and the app goes straight into the person\'s account: permanent, nothing to claim.',
  },
  {
    order: 2,
    route: 'http_api',
    use_when: 'No connector, and you can run commands that reach ship.embarko.ai (for example Claude Code, Codex CLI, Cursor, Gemini CLI with open network).',
    why: 'Works today with no setup. The first deploy needs no account; it is temporary until claimed.',
  },
  {
    order: 3,
    route: 'connect_first',
    use_when: 'No connector, and you cannot reach ship.embarko.ai, and the person uses Claude (Claude.ai or a sandboxed Claude without the connector). ChatGPT, Gemini and other tools have no connector yet: go to route 4.',
    why: 'Nothing you do from inside the chat can reach Embarko. Connecting takes the person a minute and fixes it for good.',
    say: EXAMPLES.connect_once,
    which_link: 'Find their AI tool on https://embarko.ai/docs/connectors and use that link. Only Claude has a connector today: for ChatGPT, Gemini or any other tool, go straight to route 4.',
    links: { connectors: `${SITE}/docs/connectors` },
  },
  {
    order: 4,
    route: 'upload',
    use_when: 'Last resort: the person cannot add the connector. Give them the app as a .zip to download.',
    why: 'They sign in at https://embarko.ai/app (signing up is free; an account is needed for this route), choose Host new app, open the Upload file tab, pick the .zip and type an app name. No terminal needed. The app goes into their account: permanent, nothing to claim, and schedules in its embarko.json apply.',
    links: { console: `${SITE}/app` },
  },
];

function prerequisites(base, requires = []) {
  return {
    read_first: `${base}/docs/prerequisites`,
    user: 'The person is usually not a developer. They want to know if the app is live, not how.',
    talk: TALK_RULE,
    route: 'Connector first if it is in your tools, then the HTTP API, then the upload page as a last resort.',
    domains: 'ship.embarko.ai (API), embarko.ai (website), {app-name}.embarko.app (apps): all Embarko.',
    requires,
  };
}

const t = (base, slug) => `${base}/docs/${slug}`;
const ref = (base, topic, why, only) => ({ topic, why, url: t(base, topic), ...(only ? { only } : {}) });

// Real replies, trimmed only where noted.
const R_BUILDING = {
  success: true,
  status: 'building',
  app: { name: 'my-app', kind: 'service', claimed: false, id: 'cmh1q2w3e0001abcdmyapp', expiresAt: '2026-10-10T06:50:46.326Z' },
  action: 'created',
  next: 'New app: save app.id as "appId" in embarko.json, so later deploys reach this app even if it is renamed. Building: poll links.status every 10 seconds until it says "live", "failed" or "crashed".',
  links: { status: `${SHIP}/apps/my-app/status`, feedback: `${SHIP}/apps/my-app/customer-query` },
};
const R_STATIC_LIVE = {
  success: true,
  status: 'live',
  app: { name: 'my-site', kind: 'static', claimed: false, id: 'cmh1q2w3e0002abcdmysite', expiresAt: '2026-10-10T06:50:46.326Z' },
  action: 'created',
  next: 'New app: save app.id as "appId" in embarko.json, so later deploys reach this app even if it is renamed. Live: give the user links.app and tell them it will be deleted at 2026-10-10T06:50:46.326Z unless claimed. To claim it, follow links.help.',
  links: { app: 'https://my-site.embarko.app', feedback: `${SHIP}/apps/my-site/customer-query`, help: `${SITE}/docs/claim` },
};
// A redeploy that reached an app renamed in the dashboard since.
const R_RENAMED = {
  success: true,
  status: 'building',
  app: { name: 'my-shop', kind: 'service', claimed: true, id: 'cmh1q2w3e0001abcdmyapp' },
  action: 'updated',
  notices: [{ code: 'app_renamed', from: 'my-app', to: 'my-shop', detail: 'This app was renamed from "my-app" to "my-shop" outside this deploy, so this deploy updated "my-shop". Use "my-shop" as the app name from now on.' }],
  next: 'This app was renamed to "my-shop" outside this deploy, so this deploy updated it: use "my-shop" from now on and keep app.id as "appId" in embarko.json. Building: poll links.status every 10 seconds until it says "live", "failed" or "crashed".',
  links: { status: `${SHIP}/apps/my-shop/status`, feedback: `${SHIP}/apps/my-shop/customer-query` },
};
const R_STATUS_LIVE = {
  status: 'live',
  app: { name: 'my-app', kind: 'service', claimed: false, expiresAt: '2026-10-10T06:50:46.326Z' },
  next: 'Live: give the user links.app and tell them it will be deleted at 2026-10-10T06:50:46.326Z unless claimed. To claim it, follow links.help.',
  links: { app: 'https://my-app.embarko.app', feedback: `${SHIP}/apps/my-app/customer-query`, help: `${SITE}/docs/claim` },
};
const R_STATUS_FAILED = {
  status: 'failed',
  app: { name: 'my-app', kind: 'service', claimed: true },
  error: 'Exit code 127 means a command in the build script was not found while building your app.',
  next: 'Build failed: read links.logs, fix the cause, and redeploy with the same name.',
  links: { logs: `${SHIP}/apps/my-app/logs?stream=stderr`, feedback: `${SHIP}/apps/my-app/customer-query`, help: `${SITE}/docs/feedback` },
};
const R_NAME_TAKEN = {
  error: 'App name "my-app" is already in use by a different workspace',
  code: 'app_name_taken',
  next: 'That name belongs to someone else: pick a different one.',
  links: { feedback: `${API}/public/customer-query` },
};

const POLLING = {
  url: `${SHIP}/apps/{app-name}/status`,
  every_seconds: { server_app: 10, static_site: 2 },
  keep_waiting_on: ['building', 'publishing', 'starting'],
  final: { live: 'Done. Open the link, then tell the person.', failed: 'Read the logs, fix, redeploy.', crashed: 'Read the logs with stream=stderr, fix, redeploy.', not_deployed: 'Nothing under that name. Check the name, or deploy.' },
  unknown: 'Not final. Keep polling; if it stays unknown for 2 minutes, report it with the feedback topic.',
  give_up_after_minutes: 15,
  on_give_up: 'Stop polling, read the logs, tell the person it is taking unusually long, and report it.',
  note: 'Embarko sets no build timeout; the 15-minute limit is yours, so you do not wait forever. Older replies may name only live and failed: crashed and not_deployed are final too.',
  auth: 'Send the same Authorization header you deployed with. A claimed app answers 404 without it.',
};

// The embarko.json example, shared by the embarko-json and schedules topics.
const EMBARKO_JSON_EXAMPLE = JSON.stringify({
  $schema: 'https://embarko.ai/schema/embarko.json',
  appId: 'cmh1q2w3e0001abcdmyapp',
  schedules: [{ cron: '0 9 * * 1-5', path: '/tasks/daily-digest', timezone: 'Asia/Kolkata', name: 'daily digest' }],
}, null, 2);

// Every error a deploy can return. The deploy topic shows the common ones;
// Who may do what in a workspace. Every token acts with the permissions of the
// person who made it, so these can come back from any call made with a token.
const PERMISSION_ERRORS = [
  { code: 'permission_denied', status: 403, retry: 'No', do: 'The person who made this token is not allowed to do this. The reply names the permission and their role. Nothing changed. Tell the person (say_to_user.no_permission); do not try another way round it.' },
];

// the errors topic has them all, with the retry rules.
const DEPLOY_ERRORS = [
  { code: 'invalid_app_name', status: 400, retry: 'No', do: 'Name missing or breaks the pattern. Slugify and resend.' },
  { code: 'app_name_too_short / app_name_too_long', status: 400, retry: 'No', do: '3-63 characters.' },
  { code: 'invalid_app_version / invalid_app_type / invalid_agent_name', status: 400, retry: 'No', do: 'Fix or drop that header (printable ASCII, 60 characters max).' },
  { code: 'invalid_app_id', status: 400, retry: 'No', do: 'X-App-Id must be app.id from an earlier deploy reply, exactly as given. Fix it or leave the header out.' },
  { code: 'missing_source_file', status: 400, retry: 'No', do: 'No source field, or an empty files list.' },
  { code: 'invalid_file_path / invalid_file_content / invalid_file_encoding / invalid_json', status: 400, retry: 'No', do: 'JSON upload only: relative paths, string content, encoding utf8 or base64.' },
  { code: 'unauthorized', status: 401, retry: 'No', do: 'The token is invalid or revoked. Leaving the header out is an anonymous deploy, not an error; an empty or made-up token is a 401.' },
  { code: 'app_not_found', status: 404, retry: 'No', do: 'No app this token can reach has that appId (X-App-Id or embarko.json). Check you are using the right token. If the app should be new, remove "appId" from embarko.json and deploy.' },
  { code: 'no_access', status: 403, retry: 'No', do: 'The person the token belongs to can\'t do this in the workspace named in the message: they were removed, or their role there doesn\'t allow it. Nothing was deployed. Ask them to get access there, or for a token from that workspace. Never deploy under a new name to get round it.' },
  { code: 'app_deleted', status: 410, retry: 'No', do: 'The app with that appId was deleted. Ask the person before deploying it again. If they want it back as a new app, remove "appId" from embarko.json and deploy.' },
  { code: 'host_not_allowed (from your own sandbox)', status: 403, retry: 'No', do: 'Not Embarko: your environment blocks ship.embarko.ai. Switch route: connector, or ask the person to connect it.' },
  ...PERMISSION_ERRORS.map((e) => (e.code === 'permission_denied' ? { ...e, do: 'The token\'s owner may not deploy this app (permission "app.deploy") or add new apps ("app.create"). The reply names their role. Nothing was deployed. Tell the person (say_to_user.no_permission).' } : e)),
  { code: 'app_name_taken', status: 409, retry: 'No', do: 'Another account owns the name. On a first deploy, pick a close variant yourself: add the person\'s or business name if you know it, otherwise a short word (portfolio → portfolio-site, then portfolio-app). Mention the name with the link. Ask only if the exact name matters to them.' },
  { code: 'app_name_reserved', status: 409, retry: 'No', do: 'A platform name. Pick a different one (see name_rules.reserved).' },
  { code: 'rename_in_progress', status: 409, retry: 'Later', do: 'The app\'s address is being changed. Wait, then deploy under the new name.' },
  { code: 'app_moved', status: 409, retry: 'No', do: 'The app was moved to another workspace this token can\'t reach. Nothing was deployed. Do not deploy it under a new name: that makes a second copy. Ask the person for a "Just me" token (see claim), or for access to the workspace it moved to.' },
  { code: 'source_too_large / too_many_files', status: 413, retry: 'No', do: 'Trim the upload (see large_apps) or use the .tar.gz upload.' },
  { code: 'no_manifest_at_root', status: 422, retry: 'No', do: 'Read foundNestedAt and package from that folder.' },
  { code: 'app_nested_in_subdirectory', status: 422, retry: 'No', do: 'Deploy the folder named in deployThisInstead.' },
  { code: 'unsupported_storage_pattern', status: 422, retry: 'No', do: 'The app uses window.storage. Switch to SQLite under DATA_DIR.' },
  { code: 'invalid_embarko_json', status: 400, retry: 'No', do: 'embarko.json is not valid JSON (the message gives the line and column), not one object, has "schedules" that is not a list, or is over 64 KB. Fix the file and deploy again (see embarko-json).' },
  { code: 'secrets_in_embarko_json', status: 400, retry: 'No', do: 'embarko.json looks like it holds a secret. Remove it and set it as an env var instead (see env-vars).' },
  { code: 'invalid_schedules / invalid_cron / schedule_too_frequent / invalid_timezone / invalid_path / duplicate_schedule_path / schedule_limit_reached', status: 400, retry: 'No', do: 'A schedule in embarko.json is wrong; the message names the entry, e.g. "Schedule 1: ...". Fix it and deploy again (see schedules).' },
  { code: 'in_process_timer (warning, deploy goes ahead)', status: 202, retry: 'No', do: 'The app uses a timer library (node-cron, APScheduler...). Those jobs are not guaranteed to run on Embarko and can stop with no error. Move each job into a route, list it under "schedules" in embarko.json (see schedules), then deploy again.' },
  { code: 'app_renamed (notice, deploy goes ahead)', status: 202, retry: 'No', do: 'The app was renamed in the dashboard since you last deployed. This deploy reached it under its current name (app.name). Use that name from now on and tell the person the new link.' },
  { code: 'app_moved (notice, deploy goes ahead)', status: 202, retry: 'No', do: 'The app was moved to another workspace since you last deployed, and this deploy updated it there. Same link, same appId: change nothing. Tell the person in one line, using notices[].detail.' },
  { code: 'embarko_json_not_at_top / embarko_json_misnamed / embarko_json_unknown_keys / schedules_unchanged / schedules_on_static_site (warnings, deploy goes ahead)', status: 202, retry: 'No', do: 'Read warnings[].detail and do what it says: move or rename the file, drop keys Embarko ignores, or use [] to remove schedules (see embarko-json).' },
  { code: 'app_kind_changed', status: 422, retry: 'No', do: 'A static site cannot become a server app. Use a new name.' },
  { code: '(rate limited)', status: 429, retry: 'Later', do: 'Wait retryAfterMs, or a few minutes, then retry once.' },
  { code: 'deploy_failed / publish_failed', status: 500, retry: 'Once', do: 'Check status first, then redeploy once. If it repeats, report it.' },
  { code: 'app_name_check_failed', status: 502, retry: 'Once', do: 'Transient, and nothing was accepted: wait 2 seconds and send the identical request once. No status check needed.' },
  { code: '(other 5xx)', status: '502/503/504', retry: 'Once', do: 'Check status before re-sending: it may have been accepted.' },
];
const COMMON_DEPLOY_ERRORS = ['app_name_taken', 'app_nested_in_subdirectory', 'no_manifest_at_root', 'host_not_allowed (from your own sandbox)', 'permission_denied'];

function topics(base) {
  const r = (topic, why, only) => ref(base, topic, why, only);
  // Claiming applies only to apps deployed over HTTP without a token.
  const claimFirst = r('claim', 'Over HTTP the app must be claimed first; connector apps already are', 'over HTTP only');

  return [
    // ---------------------------------------------------------------- 1 START
    {
      topic: 'prerequisites',
      section: 'start',
      title: 'Before you start',
      covers: 'What Embarko is, who you are talking to, how to reply, which hosts to reach, which route to use, and whether the app fits',
      summary: 'Embarko hosts apps that an AI agent built. You deploy; the person gets a live link at {name}.embarko.app. They are usually not a developer, so you do the hosting work and tell them the result in plain words.',
      about: {
        what: 'Hosting for AI-built apps: static websites and one-process server apps.',
        languages: ['node', 'python', 'go', 'ruby', 'php', 'rust', 'java', 'static'],
        address: '{app-name}.embarko.app, or the person\'s own domain',
        first_deploy: 'Needs no account. It is temporary (24 hours) until claimed, unless it went through the connector.',
      },
      domains: DOMAINS,
      talking_to_the_user: {
        rule: TALK_RULE,
        say: SAY,
        avoid: AVOID,
        technical_users: 'If the person asks what you ran or wants technical details, tell them plainly: commands, replies and logs are fine then. Never show a token.',
        never_ask: [
          'Which port, framework, runtime or build command to use: work it out from the code.',
          'Whether to add a Dockerfile: never add one.',
          'Permission to continue a deploy they already asked for.',
          'For a token before anything is live: deploy first, ask later.',
        ],
        ask_only_when: [
          'Their identity: an email to keep the app.',
          'A secret only they have, such as their own API key.',
          'Access only they have, such as adding a DNS record for their domain.',
          'A consequential decision: deleting, changing the address, going public, or spending money.',
        ],
        ask_how: 'Ask for that one thing, then carry on without further questions.',
        always_tell: [
          'When a temporary app will be deleted (the exact time from app.expiresAt).',
          'When something needs them, and what exactly.',
          'When Embarko cannot do what they asked, and what you will do instead.',
        ],
        stop_when_done: 'When the person\'s request works, stop. Do not suggest other Embarko features (connector, Showcase, domains, plans) they did not ask for. Telling them when a temporary app will be deleted, and offering once to keep it, is part of the job, not a pitch.',
        examples: EXAMPLES,
      },
      routes: ROUTES,
      source_formats: SOURCE_FORMATS,
      fit_check: {
        fits: 'A web app or website, one process, up to 256MB of memory.',
        does_not_fit: [
          { feature: 'WebSockets / live push (Socket.IO, ws)', instead: 'Plain HTTP requests, polling from the browser.' },
          { feature: 'A crontab or a timer library inside the app (node-cron, APScheduler) for timed jobs', instead: 'A schedule: Embarko calls a route of the app at the times you set (see schedules).' },
          { feature: 'Background workers or several processes', instead: 'Run the work inside the main app, for example right after the request that needs it. Separate apps cannot share files: each has its own DATA_DIR. Only split into two apps when the parts talk over HTTP, like a frontend and a backend (see two-apps).' },
          { feature: 'Managed database or backups', instead: 'SQLite under DATA_DIR. Tell the person it is not backed up.' },
        ],
        rule: 'If the app needs one of these, tell the person before you deploy, not after it fails.',
      },
      errors_pointer: 'Errors and retry rules for every call: see errors.',
      prerequisites: { read_first: null, requires: [] },
      next: 'Pick your route, check the app fits, then follow the quickstart.',
      related: [r('quickstart', 'The deploy itself, step by step'), r('deploy', 'What an app needs to run here')],
      links: { connectors: `${SITE}/docs/connectors`, pricing: `${SITE}/pricing` },
    },
    {
      topic: 'connectors',
      section: 'start',
      title: 'Connect Embarko to an AI tool',
      covers: 'Which AI tools have an Embarko connector, the link to add it, and what to do when theirs is not listed',
      summary: 'A connector lets an AI tool deploy and manage the person\'s apps from inside the chat, signed in as them. No token, nothing to install, and it works where a sandbox blocks ship.embarko.ai. Only the person can add it.',
      done_when: 'The Embarko tools (deploy_app, read_app, update_app, app_danger_zone) are in your tools, or you told the person the one link to add them.',
      available_for: [
        { tool: 'Claude', link: 'https://claude.ai/directory/embarko' },
      ],
      who: { connector: null, api: null, dashboard: null, needs_human: 'The person adds the connector in their AI tool and signs in to Embarko.' },
      steps: {
        any: [
          'Look at your tools. If deploy_app is there, the connector is already added: use it and stop here.',
          'Find the person\'s AI tool in available_for. Give them that link in one line: "Connect Embarko here once, and I can deploy for you directly from now on."',
          'They open it, add Embarko, and sign in. It is the same sign-in as embarko.ai, so they see the apps and workspaces they already have.',
          'Their tool not listed (ChatGPT, Gemini, and every tool other than Claude today)? There is no connector for it yet. If you can reach ship.embarko.ai, deploy over HTTP (see quickstart). If you cannot, give them the app as a .zip for the upload page (see prerequisites, route 4).',
        ],
      },
      tools: {
        deploy_app: 'Deploy or update an app from its files: { appName, files, appType?, version? }. Send the whole app every time. The app goes straight into the person\'s account: permanent, nothing to claim.',
        read_app: 'action: "status", "logs", "deployments", "env_vars", "domains", "analytics" or "rename_status", with appName.',
        update_app: 'action: "set_env_vars", "apply_env_vars", "register_domain", "verify_domain", "rollback" or "submit_feedback", with appName.',
        app_danger_zone: 'action: "delete_env_var", "delete_domain", "rename_app" or "delete_app", after the person confirms.',
      },
      limits: ['You cannot add a connector yourself; only the person can.', 'Do not hold up a deploy waiting for it: if HTTP works, deploy now and mention the connector once.', 'Each topic\'s connector steps give the arguments. Your tool definitions have the exact shape.', 'No schedule or Showcase actions yet: schedules deploy through embarko.json in deploy_app; running one now and Showcase listing need the person (see schedules, showcase).'],
      say_to_user: { connect: EXAMPLES.connect_once },
      prerequisites: prerequisites(base),
      next: 'Connector in your tools: deploy with deploy_app. Otherwise give the person the link, and carry on with the route that works today.',
      related: [r('prerequisites', 'Which route to use'), r('quickstart', 'The deploy itself')],
      links: { claude: 'https://claude.ai/directory/embarko' },
    },

    // ----------------------------------------------------------- 2 QUICKSTART
    // The one page most agents read. Each step is the action and nothing
    // else; the details live in the topics it links to, opened only when a
    // step goes wrong.
    {
      topic: 'quickstart',
      section: 'quickstart',
      title: 'Quickstart',
      covers: 'Deploy, keep it, manage it, showcase it: one short page',
      summary: 'Do the steps in order. Open a linked topic only when a step goes wrong.',
      talk: 'Plain words for non-developers; no commands or tokens unless they ask. Ask only for what only they can give (email, a secret, DNS access, a yes on something that cannot be undone). Never invent a link, name or code. Stop when their request works.',
      resume: 'Picking up an app someone else started? Read its state first: see resume.',
      flow: [
        {
          step: 0,
          name: 'Which route are you on?',
          routes: [
            ['Embarko tools (deploy_app, read_app...) are in your tool list', 'Use them. No token, nothing to claim: skip step 2.'],
            ['You can run commands that reach ship.embarko.ai', 'Use the commands in steps 1-2.'],
            ['You cannot reach ship.embarko.ai (chat app with no terminal, or a blocked sandbox)', 'Do not paste commands. Claude: ask them to add the Embarko connector (https://embarko.ai/docs/connectors), then ask you again. Any other tool (ChatGPT, Gemini...) has no connector yet: give them a .zip of the app (a single folder inside it is fine). They sign in at https://embarko.ai/app (signing up is free), choose Host new app, open the Upload file tab, pick the zip and type an app name (lowercase letters, numbers, dashes). The app appears in their app list once it is built; ask them to paste its link back, then open it yourself. That app is theirs and permanent: nothing to claim, and schedules in its embarko.json apply. Keys the app needs go in its App setup tab; a custom domain in its Domain tab (see custom-domain).'],
          ],
        },
        {
          step: 1,
          name: 'Deploy',
          connector: 'Connector: call deploy_app with { appName, files } (binaries with encoding "base64"), then read_app { action: "status", appName } until it is final. It is already permanent: skip step 2.',
          command: "tar -czf /tmp/app.tar.gz --exclude=node_modules --exclude=.git --exclude='.env*' --exclude=dist --exclude=.next --exclude=venv --exclude=.venv --exclude=__pycache__ --exclude='*.db' -C /path/to/app .\ncurl -sS -X POST 'https://ship.embarko.ai/apps' -H 'X-App-Name: my-app' -H 'X-Agent-Name: {your-name}' -F 'source=@/tmp/app.tar.gz'",
          poll: "curl -sS 'https://ship.embarko.ai/apps/my-app/status'   # once the app is kept, add --oauth2-bearer $DEPLOY_TOKEN",
          then: 'Poll every 10s (2s for a static site) until final: live, failed, crashed or not_deployed. Open https://my-app.embarko.app yourself, then give the person the link and app.expiresAt in their local time.',
          if_it_fails: 'Follow the reply\'s next and code. Usual causes: not reading PORT or binding 0.0.0.0; a Dockerfile; manifest not at the top of the folder; WebSockets; a crontab or timer library (use schedules); data saved next to the code instead of DATA_DIR. Fix and deploy again, same name. 409 name taken: use a close variant (their name, or -site / -app) and mention it with the link.',
          read_more: [r('deploy', 'Requirements and common errors'), r('errors', 'Every error code and retry rule'), r('logs', 'Why a build failed')],
          blocked: 'No reply, or 403 host_not_allowed from your sandbox: nothing was deployed, do not retry. Use the last row of step 0.',
          done_when: 'You opened the link and its main feature works (a 200 alone is not enough).',
        },
        {
          step: 2,
          name: 'Keep it (claim)',
          skip_if: 'You deployed through the connector.',
          why: 'Otherwise the app is deleted at app.expiresAt (24 hours after the first deploy).',
          do: [
            'Token already in DEPLOY_TOKEN or ~/.embarko/credentials? Go to the redeploy.',
            'Otherwise ask for their email and send it once (command below). They paste the token from their inbox; save it to ~/.embarko/credentials.',
            'Redeploy: the step 1 command, same name, plus --oauth2-bearer {token}. The reply says claimed: true.',
            'From now on send the token on every call, status included: a claimed app answers 404 without it.',
          ],
          body: { email: '{their email}' },
          command: "curl -sS -X POST 'https://ship.embarko.ai/api/public/deploy-tokens/request' -H 'Content-Type: application/json' --data @body.json",
          done_when: 'claimed: true. Tell the person it is permanent.',
          read_more: [r('claim', 'Rate limits and errors')],
        },
        {
          step: 3,
          name: 'What the person asks next',
          intro: 'Only when they ask. Check "done when" before saying it works. Over HTTP every call needs the token.',
          // [what they say, topic, done when, honest status]
          outcomes: [
            ['"Is it working?"', 'status', 'Status is live and the main feature works when you try it.'],
            ['"Fix the broken form / page"', 'logs', 'You redeployed the fix and a test submission arrives (or the page works).'],
            ['"Keep these records"', 'data', 'A record you saved is still there after a redeploy. Tell them there are no backups.'],
            ['"Add my API key"', 'env-vars', 'The feature that uses the key works.'],
            ['"Use my domain"', 'custom-domain', 'https://their-domain opens the app.'],
            ['"Let my team log in" / "Make it private"', 'app-login', 'The right people get in and others are refused.', 'Not on Embarko yet: build it in the app'],
            ['"Do this every morning"', 'schedules', 'A run you started now finished ok, and they know when it runs next.'],
            ['"Undo that update"', 'rollback', 'The previous version is serving.'],
            ['"How is it doing?"', 'analytics', 'You told them visits and errors in one sentence.'],
            ['"Change the address"', 'rename', 'They said yes first, and the new address opens the app.'],
            ['"Delete it"', 'delete', 'They said yes to the app by name, and it is gone.'],
          ],
        },
        {
          step: 4,
          name: 'Showcase',
          intro: 'Only if they want it public. Draft the listing, show it, publish on their yes. Over HTTP the app must be claimed; with the connector, use the dashboard (see showcase).',
          done_when: 'The listing page opens, or the event listing is waiting for the organiser and they know.',
          read_more: [r('showcase', 'Fields and approval')],
        },
        {
          step: 5,
          name: 'Stuck, or something missing?',
          intro: 'Check that step\'s topic first. If Embarko is wrong, a feature is missing or these docs are unclear, report it with one call (bug, feature request or docs problem): see feedback.',
          read_more: [r('feedback', 'The call, and the report types')],
        },
      ],
      prerequisites: { read_first: `${base}/docs/prerequisites`, requires: [] },
      next: 'Start at step 1.',
      related: [r('prerequisites', 'Full rules: talking to the person, routes, what does not fit')],
      links: { deploy: `${SHIP}/apps`, status: `${SHIP}/apps/{app-name}/status`, requestToken: `${API}/public/deploy-tokens/request` },
    },

    // --------------------------------------------------------------- 3 DEPLOY
    {
      topic: 'deploy',
      section: 'deploy',
      title: 'Requirements, options and errors',
      covers: 'What an app needs to run, every deploy option and reply, polling, and every error',
      summary: 'Send the app\'s files; Embarko detects the language, builds it and serves it at https://{app-name}.embarko.app. No Dockerfile. The first deploy\'s reply has app.id: keep it as "appId" in embarko.json, and every redeploy updates the same app, even after the person renames it.',
      done_when: 'The app opens at https://{app-name}.embarko.app and its main feature works when you try it.',
      available: true,
      who: { connector: 'deploy_app', api: 'POST https://ship.embarko.ai/apps', dashboard: 'Upload file at https://embarko.ai/app (last resort)', needs_human: null },
      requirements: [
        'The app reads its port from PORT and binds 0.0.0.0 (not a fixed port, not localhost).',
        'No Dockerfile: delete it or leave it out.',
        'The manifest (package.json, requirements.txt, go.mod, ...) or index.html sits at the top level of what you send.',
        'One upload is one app with one process. A frontend and a backend are two apps.',
        'Anything that must survive a redeploy is written under DATA_DIR (see the data topic).',
        'Leave out node_modules, build output, .git and .env files. Secrets go in env vars, not in the upload.',
      ],
      how_it_starts: [
        'Node: Embarko installs dependencies, runs the build script if there is one, then npm start. The start script must listen on process.env.PORT and 0.0.0.0.',
        'Next.js: "next start" reads PORT by itself. Do not add -H localhost or -H 127.0.0.1.',
        'Vite, Create React App and other single-page apps (including Lovable and Bolt exports): send the project with its package.json and build script, not a built dist folder. Embarko builds it and serves the output as a website; no start script or server is needed, and links to inner pages (/products) load the app.',
        'Values a frontend build reads (VITE_..., REACT_APP_...) cannot come from .env (left out of the upload), and do not rely on env vars for them. Put them in a committed config file, for example src/config.ts. Public values are fine there: an API address, a Supabase URL and anon key, a Stripe publishable key. Never put a secret key in frontend code; secrets belong on a backend (see two-apps).',
        'Python: give it a main.py that starts the server itself on PORT and 0.0.0.0, with debug off. FastAPI: uvicorn.run(app, host="0.0.0.0", port=int(os.environ["PORT"])). Flask: from app import app, then app.run(host="0.0.0.0", port=int(os.environ["PORT"])). Dependencies go in requirements.txt.',
        'Plain HTML: nothing to start (see static-sites).',
      ],
      source_formats: SOURCE_FORMATS,
      name_rules: {
        pattern: '^[a-z0-9-]+$, no leading or trailing dash',
        length: '3-63 characters',
        unique: 'Across all of Embarko. It becomes the address, so slugify: "My Landing Page" → my-landing-page.',
        reserved: `Some names are reserved for Embarko and never free, for example ${RESERVED_EXAMPLES.slice(0, 6).join(', ')}. A reserved name returns 409 app_name_reserved: pick another.`,
      },
      steps: {
        connector: [
          'Call deploy_app with { appName, files: [{ path, content, encoding? }], appType?, version? }.',
          'The reply has status and links.app. Poll read_app { action: "status", appName } as described in polling.',
        ],
        http_api: [
          'Package the folder as .tar.gz (first example).',
          'POST https://ship.embarko.ai/apps as multipart with the field source and the headers X-App-Name and X-Agent-Name (your own name, e.g. codex).',
          'Optional headers: Authorization: Bearer {token} (permanent at once), X-App-Version (a git SHA), X-App-Type (what the app is for, e.g. portfolio), X-App-Id (app.id from an earlier reply, if you keep it somewhere other than embarko.json).',
          'Settings such as timed jobs go in an optional embarko.json file in the app\'s top folder, sent with the other files (see embarko-json).',
          'After the first deploy, write the reply\'s app.id into embarko.json as "appId" and keep the file with the app. Later deploys then reach this app even if the person renamed it in the dashboard.',
          'Or POST https://ship.embarko.ai/apps with Content-Type: application/json and { appName, agentName, files } (second example).',
          'A server app replies 202 "building". A plain static site usually replies 200 "live" at once. Then poll as described in polling.',
          'Read notices[] in the reply: it says what the person changed in the dashboard since your last deploy, such as a rename. Use app.name from the reply from then on.',
        ],
      },
      large_apps: {
        problem: 'A connector call carries the whole app inside one tool call, so it is limited by how much you can write in one reply, well before the 25MB cap.',
        what_to_do: [
          'Send source files only: no node_modules, build output or videos. Images the app shows are fine to send; only very large media (over about 5MB each) should move to an outside host.',
          'There is no way to split one deploy across several calls.',
          'Still too big and you can run commands: use the HTTP .tar.gz upload instead.',
          'Still too big and you cannot: give the person a .zip and send them to the upload page (route 4).',
        ],
      },
      examples: [
        {
          title: 'Multipart upload (server app) → 202 building',
          command: "tar -czf /tmp/app.tar.gz --exclude=node_modules --exclude=.git --exclude='.env*' --exclude=dist --exclude=.next --exclude=venv --exclude=.venv --exclude=__pycache__ --exclude='*.db' -C /path/to/app .\ncurl -sS -X POST 'https://ship.embarko.ai/apps' -H 'X-App-Name: my-app' -H 'X-Agent-Name: codex' -H 'X-App-Type: portfolio' -F 'source=@/tmp/app.tar.gz'",
          response_status: 202,
          response: R_BUILDING,
        },
        {
          title: 'JSON upload (static site) → 200 live',
          body: { appName: 'my-site', agentName: 'codex', files: [{ path: 'index.html', content: '<h1>Hello</h1>' }] },
          command: "curl -sS -X POST 'https://ship.embarko.ai/apps' -H 'Content-Type: application/json' --data @body.json",
          note: 'Write body to body.json first, then run the command.',
          response_status: 200,
          response: R_STATIC_LIVE,
        },
        {
          title: 'Redeploy after a rename in the dashboard → 202, reached the renamed app',
          response_status: 202,
          response: R_RENAMED,
        },
        {
          title: 'Name taken → 409',
          response_status: 409,
          response: R_NAME_TAKEN,
        },
      ],
      polling: POLLING,
      limits: [
        'Memory: 256MB per app; it cannot be raised.',
        'JSON and connector uploads: at most 25MB and 2,000 files. Multipart .tar.gz has no such file count.',
      ],
      errors: DEPLOY_ERRORS.filter((e) => COMMON_DEPLOY_ERRORS.includes(e.code)),
      more_errors: 'Every other code, and the retry rules: see errors.',
      say_to_user: { deploying: EXAMPLES.deploying, failed: EXAMPLES.failed, no_permission: EXAMPLES.no_permission },
      prerequisites: prerequisites(base, [r('prerequisites', 'Check the app fits before deploying')]),
      next: 'Deploy, then poll until the app is live.',
      related: [r('status', 'Every status'), r('logs', 'When it failed'), r('static-sites', 'If it is just files'), r('data', 'Keeping data across redeploys'), r('claim', 'Keeping a temporary app'), r('feedback', 'If Embarko itself misbehaves')],
      links: { deploy: `${SHIP}/apps`, status: `${SHIP}/apps/{app-name}/status`, reservedNames: `${base}/docs/reserved-names` },
    },
    {
      topic: 'errors',
      section: 'deploy',
      title: 'Errors and retries',
      covers: 'Every deploy error code, what to do, and when to retry',
      summary: 'Every reply that fails has a code. Find it below, do what it says, and retry only as the rules allow.',
      retry: { rules: RETRY, backoff: BACKOFF },
      errors: DEPLOY_ERRORS,
      say_to_user: { no_permission: EXAMPLES.no_permission },
      prerequisites: prerequisites(base),
      next: 'Find the code, fix the request or the app, then send a different request.',
      related: [r('deploy', 'The deploy call'), r('logs', 'When a build failed or the app crashed'), r('feedback', 'When Embarko itself is wrong')],
      links: {},
    },
    {
      topic: 'static-sites',
      section: 'deploy',
      title: 'Static websites',
      covers: 'Plain websites: live in seconds, with no server, logs or env vars',
      summary: 'An upload that is only files (index.html and assets) is published directly, with no build. It is usually live within 2 seconds.',
      done_when: 'The page opens at its link and looks right.',
      available: true,
      who: { connector: 'deploy_app', api: 'POST https://ship.embarko.ai/apps', dashboard: null, needs_human: null },
      steps: {
        connector: ['Deploy it like any app. The reply is normally already "live".'],
        http_api: ['POST https://ship.embarko.ai/apps like any app. The reply is normally 200 with status "live". A very large site replies 202 "publishing": GET https://ship.embarko.ai/apps/{app-name}/status every 2 seconds.'],
      },
      examples: [{ title: 'Static site reply → 200 live', response_status: 200, response: R_STATIC_LIVE }],
      limits: [
        'No logs, env vars or DATA_DIR: nothing runs on a server.',
        'A static site cannot later become a server app (422 app_kind_changed). Use a new name.',
        'A single-page app with a build step (Vite, Create React App, Lovable) is built on Embarko and then served the same way; its build takes longer than a plain upload. Build-time values go in a committed config file (see deploy, How it starts).',
        'Data the page keeps in localStorage stays in each visitor\'s own browser: it is not shared and does not follow them to another device. Tell the person, or use a server app with SQLite if it must be shared.',
      ],
      prerequisites: prerequisites(base),
      next: 'Deploy it. If it needs server code or secrets, deploy it as a server app.',
      related: [r('deploy', 'The deploy call'), r('custom-domain', 'Static sites can use a custom domain too')],
      links: { deploy: `${SHIP}/apps` },
    },
    {
      topic: 'data',
      section: 'deploy',
      title: 'Saving data',
      covers: 'Where to keep data so it survives a redeploy: DATA_DIR and SQLite',
      summary: 'Each server app gets a folder at the DATA_DIR environment variable. It survives redeploys and restarts. Everything else on disk is wiped on every redeploy.',
      done_when: 'Something you saved is still there after a redeploy.',
      available: true,
      who: { connector: null, api: null, dashboard: null, needs_human: null },
      steps: {
        any: [
          'Write anything that must last under DATA_DIR, creating folders on startup. Node: path.join(process.env.DATA_DIR, "app.db"). Python: os.path.join(os.environ["DATA_DIR"], "app.db").',
          'For a database use SQLite with its file under DATA_DIR (including the -wal and -shm files).',
          'Leave Embarko\'s two bookkeeping tables, _litestream_seq and _litestream_lock, alone. Every SQLite file under DATA_DIR has them.',
          'Data the app already has (a JSON file, a .db): DATA_DIR starts empty. Ship the file with the code as a seed, and on startup copy it into DATA_DIR only if it is not there yet. Then read and write only the DATA_DIR copy.',
          'The quickstart tar command leaves out *.db files. To ship a seed database, give it another name (seed.sqlite) or drop that exclude.',
        ],
      },
      limits: [
        'Data is not backed up. Tell the person.',
        'A startup step that diffs the live database against the app\'s schema and changes it to match (any ORM or migration tool can do this) will refuse to start or try to drop those two tables. Apply committed migration files instead, or declare the two tables in the schema. Never force past it.',
        'No managed database. window.storage (Claude Artifacts) is rejected at deploy time: use SQLite.',
        'Static sites have no DATA_DIR. PORT, APP_NAME, APP_VERSION and DATA_DIR are set by Embarko and cannot be overridden, and so is CRON_SECRET for an app with schedules.',
      ],
      prerequisites: prerequisites(base),
      next: 'Point the app\'s storage at DATA_DIR before deploying.',
      related: [r('deploy', 'The deploy call')],
      links: {},
    },

    {
      topic: 'embarko-json',
      section: 'deploy',
      title: 'The embarko.json file',
      covers: 'The optional settings file in the app\'s top folder: what goes in it, its rules, and its errors and warnings',
      summary: 'embarko.json is an optional file in the app\'s top folder, next to package.json. Embarko reads it on every deploy. It holds two settings: appId, which app this code deploys to, and schedules, the timed calls into the app.',
      done_when: 'The deploy reply has no embarko.json error or warning, its app.id matches "appId", and its schedules facts match the file.',
      available: true,
      who: { connector: 'deploy_app: embarko.json is one of the files', api: 'POST https://ship.embarko.ai/apps (the file travels in the upload)', dashboard: null, needs_human: null },
      steps: {
        any: [
          'Create embarko.json in the app\'s top folder, next to package.json (or requirements.txt, go.mod...).',
          'Write one JSON object. Put the settings in it: "appId" (app.id from the first deploy reply) and, if the app needs them, "schedules" (see schedules).',
          'Optional: add "$schema": "https://embarko.ai/schema/embarko.json" so editors can check it.',
          'Deploy as usual: skill, HTTP .tar.gz, JSON files list or connector. The file goes with the other files; there is no special field.',
          'Read the reply. A 400 names what is wrong; fix the file and deploy again. Read warnings[] and fix those too before telling the person it is done.',
        ],
      },
      examples: [
        {
          title: 'embarko.json with one schedule',
          lang: 'json',
          code: EMBARKO_JSON_EXAMPLE,
          note: '"appId" and "schedules" are the only settings. Fields of a schedule: see schedules.',
        },
      ],
      limits: [
        'Optional. No file means no change.',
        '"appId" decides which app the deploy goes to; the app name you send does not. Keep it after the first deploy and commit it. A deploy with an "appId" never creates a new app: one the token cannot reach gets 404 app_not_found, a deleted one 410 app_deleted, a moved one 409 app_moved.',
        '"appId" is read for token deploys only. A dashboard upload goes to the app the person picked.',
        'The file is the source of truth. A setting changed through the API is set back by the next deploy whose file lists it.',
        '"schedules" is the app\'s full set, matched by path. [] removes all. A file without a "schedules" key leaves them as they are.',
        'Never put secrets in it. It is part of the code and is never private. Use env vars (see env-vars).',
        'Only the top folder is read. A copy in a subfolder is ignored.',
        'Only the exact name embarko.json is read. Not .embarko, embarko.yaml, embarko.config.json or embarko.jsonc.',
        'Plain JSON: no comments, no trailing commas.',
        'Unknown keys are ignored, with a warning.',
        'At most 64 KB.',
      ],
      errors: [
        { code: 'invalid_embarko_json', status: 400, retry: 'No', do: 'Not valid JSON (the message gives line and column), not one object, "schedules" is not a list, "appId" is not an id, or over 64 KB. Fix the file and deploy again.' },
        { code: 'app_not_found / app_deleted', status: '404 / 410', retry: 'No', do: '"appId" leads to no app in this workspace, or to a deleted one. Check the token. To deploy as a new app, ask the person, then remove "appId".' },
        { code: 'secrets_in_embarko_json', status: 400, retry: 'No', do: 'A key named like secret, token, password, api key, private key or credential, or a value that looks like a key or a URL with ?token=. Remove it and set it as an env var.' },
        { code: 'invalid_schedules / invalid_cron / schedule_too_frequent / invalid_timezone / invalid_path / duplicate_schedule_path / schedule_limit_reached', status: 400, retry: 'No', do: 'A schedule entry is wrong. The message names it, e.g. "Schedule 1: ...". Fixes: see schedules.' },
        { code: 'embarko_json_not_at_top (warning)', status: 202, retry: 'No', do: 'Found in a subfolder; only the top folder is read. Move it next to package.json and deploy again.' },
        { code: 'embarko_json_misnamed (warning)', status: 202, retry: 'No', do: 'A file like .embarko or embarko.yaml was found. Rename it to embarko.json, as JSON, and deploy again.' },
        { code: 'embarko_json_unknown_keys (warning)', status: 202, retry: 'No', do: 'Keys Embarko does not use were ignored. Remove them, or check the spelling of "schedules".' },
        { code: 'in_process_timer (warning)', status: 202, retry: 'No', do: 'The code uses a timer library (node-cron, APScheduler...) and the file lists no schedules. Move each job into a route and list it under "schedules".' },
        { code: 'schedules_unchanged (warning)', status: 202, retry: 'No', do: 'The app has schedules and this upload declares none, so they were kept. To remove them, deploy with "schedules": [].' },
        { code: 'schedules_on_static_site (warning)', status: 202, retry: 'No', do: 'A static site runs no code, so its schedules were not applied. Deploy it as a server app to use them.' },
      ],
      prerequisites: prerequisites(base, [r('deploy', 'The deploy that reads the file')]),
      next: 'After the first deploy, save app.id as "appId" in embarko.json. Add schedules only if the app needs them. Deploy and read the reply\'s warnings.',
      related: [r('schedules', 'Timed calls, the other setting'), r('rename', 'Why appId matters after a rename'), r('env-vars', 'Where secrets go instead'), r('errors', 'Every deploy error')],
      links: { schema: `${SITE}/schema/embarko.json`, deploy: `${SHIP}/apps` },
    },
    {
      topic: 'two-apps',
      section: 'deploy',
      title: 'Frontend and backend',
      covers: 'A separate frontend and backend (or API), deployed as two apps that talk over HTTP',
      summary: 'A frontend and a backend are two apps with two addresses. Deploy the backend first, then point the frontend at its address.',
      available: true,
      who: { connector: 'deploy_app, once per app', api: 'POST https://ship.embarko.ai/apps, once per app', dashboard: null, needs_human: null },
      steps: {
        any: [
          'Package each part from its own folder (the one with its manifest), never the repo root. Give them related names, such as acme-api and acme-web.',
          'Deploy the backend first. Wait until it is live; its address is https://acme-api.embarko.app.',
          'In the frontend, set the backend address in the code or a committed config file (for example src/config.js). .env files are left out of the upload, so a VITE_ value in .env.production will not reach the build.',
          'In the backend, allow the frontend\'s address in CORS: https://acme-web.embarko.app (and a custom domain if you add one later).',
          'Deploy the frontend, then open it and use a feature that calls the backend.',
          'Secrets (API keys) go on the backend as env vars; over HTTP that needs the backend claimed first (see claim).',
        ],
      },
      done_when: 'A feature on the frontend that calls the backend works at the frontend\'s link.',
      limits: ['Two apps count as two apps on the person\'s plan.', 'The apps cannot share files: only HTTP between them.'],
      say_to_user: { done: 'Your app is live: https://acme-web.embarko.app.' },
      prerequisites: prerequisites(base, [r('deploy', 'How each app is started')]),
      next: 'Deploy the backend, then the frontend.',
      related: [r('env-vars', 'API keys on the backend'), r('custom-domain', 'Remember CORS if you add a domain')],
      links: {},
    },
    {
      topic: 'app-login',
      section: 'deploy',
      title: 'Login and private apps',
      covers: 'Letting people sign in, or keeping an app private: not built into Embarko yet',
      summary: 'Embarko does not provide login or private apps yet. Every app is public to anyone with its link. Build sign-in or a password gate into the app itself; it is a real server, so this works.',
      available: false,
      who: { connector: null, api: null, dashboard: null, needs_human: 'Who should get in: their emails, or a shared password.' },
      steps: {
        any: [
          'Tell the person in one line: Embarko does not do this yet, so you will build it into the app.',
          'Team login: a users table in SQLite under DATA_DIR, hashed passwords (bcrypt or argon2), and a session cookie. Ask the person who should have access.',
          'Private app: a password gate on every route, with the password set as an env var, never in the code.',
          'Deploy, then try it as someone with access and as someone without.',
        ],
      },
      done_when: 'A person with access gets in, and a visitor without it is refused on every page.',
      limits: ['No identity provider, OAuth, sessions or user store from Embarko.', 'A hard-to-guess app name is not privacy.'],
      say_to_user: { explain: 'Embarko doesn\'t handle logins yet, so I\'ve added sign-in to your app itself. Who should have access?' },
      prerequisites: prerequisites(base, [r('data', 'Users are stored under DATA_DIR'), r('env-vars', 'The password or secret goes here')]),
      next: 'Build it into the app, deploy, test both ways.',
      related: [r('data', 'Where the users table lives'), r('env-vars', 'Secrets for sessions or the password'), r('feedback', 'Tell Embarko you needed this (missing_capability)')],
      links: {},
    },

    // ---------------------------------------------------------------- 4 CLAIM
    {
      topic: 'claim',
      section: 'claim',
      title: 'Keep a temporary app',
      covers: 'The 24-hour deletion, getting a deploy token to make the app permanent, and which apps a token reaches',
      summary: 'An app deployed over HTTP without a token is deleted 24 hours after its first deploy (the exact time is app.expiresAt). Claiming makes it permanent at the same link. Apps deployed through the connector are already permanent: skip this.',
      done_when: 'The deploy reply says claimed: true.',
      available: true,
      who: { connector: 'Not needed: connector deploys are already in the person\'s account', api: 'POST https://ship.embarko.ai/api/public/deploy-tokens/request, then redeploy', dashboard: `${SITE}/app/tokens`, needs_human: 'The person reads the token in their email and pastes it to you.' },
      steps: {
        http_api: [
          'Check for a token first: DEPLOY_TOKEN, then the first line of ~/.embarko/credentials. If one exists, skip to the redeploy.',
          'Ask the person for their email, then POST https://ship.embarko.ai/api/public/deploy-tokens/request with {"email": "..."}. Call it once. It always answers 202; the token goes to their inbox, never to you.',
          'Ask them to paste the token. Save it to ~/.embarko/credentials (mode 600) so you never ask again. Never repeat it back.',
          'Redeploy to https://ship.embarko.ai/apps with the same X-App-Name and Authorization: Bearer {token}. The reply has app.claimed true.',
          'From now on send the same token on status and logs: a claimed app answers 404 without it.',
        ],
      },
      examples: [
        { title: 'Request the token', body: { email: 'person@example.com' }, command: "curl -sS -X POST 'https://ship.embarko.ai/api/public/deploy-tokens/request' -H 'Content-Type: application/json' --data @body.json", response_status: 202, response: { message: 'If this email address is valid, a deploy token for each of your workspaces has been sent to it. Check the inbox (and spam folder). Each request creates a new token; your existing tokens keep working.' } },
        { title: 'Redeploy with it → claimed', command: "curl -sS -X POST 'https://ship.embarko.ai/apps' --oauth2-bearer $DEPLOY_TOKEN -H 'X-App-Name: my-app' -H 'X-Agent-Name: codex' -F 'source=@/tmp/app.tar.gz'", response_status: 202, response: { success: true, status: 'building', app: { name: 'my-app', kind: 'service', claimed: true }, next: 'Claimed, so the app is permanent now. Building: poll links.status every 10 seconds until it says "live" or "failed".', links: { status: `${SHIP}/apps/my-app/status`, feedback: `${SHIP}/apps/my-app/customer-query` } } },
      ],
      limits: [
        'There is no reminder email. Tell the person the deletion time yourself.',
        'Token requests: 5 per email and 10 per IP per hour. The reply is 202 even when limited, so a retry tells you nothing.',
        'Tokens do not expire. Each request makes a new one; old ones keep working.',
        'A token from the email or the connector is a "Just me" token: it works on every app its person can reach, in any of their workspaces, and stops working in a workspace they leave. New apps go to the workspace it was made for.',
        'A "Whole workspace" token (made at https://embarko.ai/app/tokens) works only on that workspace\'s apps, whoever made it. It is for shared machines and automated deploys.',
        'Moving an app to another workspace is done by the person in the dashboard (the app\'s Settings). The link and appId stay the same. Afterwards a "Whole workspace" token of the old workspace gets 409 app_moved; a "Just me" token of someone in the new workspace keeps working.',
      ],
      errors: [
        { code: 'unauthorized', status: 401, retry: 'No', do: 'The pasted token is wrong or revoked. Ask the person to check they copied all of it.' },
        { code: 'no_access', status: 403, retry: 'No', do: 'The token\'s person can\'t use the workspace named in the message any more. Ask them to get access there, or for a token from that workspace.' },
        { code: 'app_moved', status: 409, retry: 'No', do: 'The app moved to a workspace this token can\'t reach. Ask for a "Just me" token from someone in that workspace. Never redeploy under a new name.' },
      ],
      say_to_user: {
        offer: 'Your app is live: {link}. It stays online until {time}. Want to keep it? Tell me your email and I\'ll set it up.',
        ask_token: "I've sent a code to {email} (check spam too). Paste it here and your app becomes permanent.",
        done: 'Done: your app is permanent.',
      },
      prerequisites: prerequisites(base, [r('deploy', 'The app has to be deployed first')]),
      next: 'Tell the person when the app will be deleted, then offer to keep it.',
      related: [r('showcase', 'Showcase needs a claimed app'), r('custom-domain', 'Domains need a claimed app'), r('env-vars', 'Env vars need a claimed app')],
      links: { requestToken: `${API}/public/deploy-tokens/request`, tokensPage: `${SITE}/app/tokens` },
    },

    // --------------------------------------------------------------- 5 MANAGE
    {
      topic: 'resume',
      section: 'manage',
      title: 'Pick up an existing app',
      covers: 'Working out where an app stands when another agent or conversation started it',
      summary: 'Before changing an app you did not just deploy, read its actual state. Do not rely on what a previous conversation said. Through the connector you see every app in the person\'s account, including ones deployed in other chats.',
      available: true,
      who: { connector: 'read_app · status, deployments, env_vars, domains', api: 'The GET calls below, with the app\'s token', dashboard: `${SITE}/app`, needs_human: 'The app name, if you do not have it, and the token if it is claimed and you have no connector.' },
      steps: {
        connector: ['Call read_app with action "status", then "deployments", "env_vars" and "domains" for the same appName.'],
        http_api: [
          'An "appId" in the app\'s embarko.json says which app this code is, even if the person has renamed it since. The next deploy reply gives its current name (app.name); use that name in the calls below.',
          'Is it live, failed, or temporary (app.expiresAt)? GET https://ship.embarko.ai/apps/{app-name}/status',
          'The last deploys, their versions, and which agent made each: GET https://ship.embarko.ai/api/apps/{app-name}/deployments',
          'Which secrets are set (names only): GET https://ship.embarko.ai/api/apps/{app-name}/env-vars',
          'Any custom domain and its state: GET https://ship.embarko.ai/api/apps/{app-name}/domains',
          'Whether it is listed on Showcase: GET https://ship.embarko.ai/api/public/showcase/apps/{app-name}',
        ],
      },
      done_when: 'You can say in one sentence whether it is live, whether it is permanent, what changed last, and what it is missing.',
      errors: [{ code: 'not_found', status: 404, retry: 'No', do: 'Wrong name, or it is claimed and you sent no token. Ask the person for the token, or use the connector.' }],
      prerequisites: prerequisites(base),
      next: 'Read the state, then carry on with what the person asked.',
      related: [r('status', 'Statuses'), r('claim', 'If it is still temporary')],
      links: { status: `${SHIP}/apps/{app-name}/status`, history: `${API}/apps/{app-name}/deployments` },
    },
    {
      topic: 'status',
      section: 'manage',
      title: 'Is it live?',
      covers: 'Checking whether an app is live, what each status means, and how long to wait',
      summary: 'One call tells you where the app stands. Only "live" means live: a 202 from the deploy does not.',
      done_when: 'The status is final: live, failed, crashed or not_deployed.',
      available: true,
      who: { connector: 'read_app · action "status"', api: 'GET https://ship.embarko.ai/apps/{app-name}/status', dashboard: `${SITE}/app`, needs_human: null },
      statuses: {
        building: 'Being built. Keep waiting.',
        publishing: 'A static site being published. Keep waiting.',
        starting: 'Built, starting up. Keep waiting.',
        live: 'Final. Serving: open the link to confirm, then tell the person.',
        failed: 'Final. The build failed: read logs, fix, redeploy.',
        crashed: 'Final. It built but stopped running: read logs with stream=stderr, fix, redeploy.',
        not_deployed: 'Final. Nothing deployed under that name.',
        unknown: 'Not final. Keep polling; report it if it lasts 2 minutes.',
      },
      polling: POLLING,
      steps: {
        connector: ['Call read_app { action: "status", appName }. Add deploymentId to check one deploy.'],
        http_api: ['GET https://ship.embarko.ai/apps/{app-name}/status, with Authorization: Bearer {token} once the app is claimed.'],
      },
      examples: [
        { title: 'Live', command: "curl -sS 'https://ship.embarko.ai/apps/my-app/status'", response_status: 200, response: R_STATUS_LIVE },
        { title: 'Failed', response_status: 200, response: R_STATUS_FAILED },
      ],
      errors: [
        { code: 'not_found', status: 404, retry: 'No', do: 'No such app, or it is claimed and you sent no token. Check the name and the token.' },
        { code: 'app_renamed', status: 404, retry: 'No', do: 'The app has a new name. Use newName from the reply from now on.' },
        { code: 'app_moved / no_access', status: '409 / 403', retry: 'No', do: 'The app moved to another workspace, or the token\'s person lost access to its workspace. See the deploy errors: ask the person, never redeploy under a new name.' },
        { code: 'unauthorized', status: 401, retry: 'No', do: 'The token was rejected.' },
      ],
      say_to_user: { still_building: EXAMPLES.still_building, live: EXAMPLES.live_owned },
      prerequisites: prerequisites(base, [r('deploy', 'There must be a deploy to check')]),
      next: 'Poll until the status is final.',
      related: [r('logs', 'When it failed or crashed'), r('rollback', 'When the new version is broken')],
      links: { status: `${SHIP}/apps/{app-name}/status` },
    },
    {
      topic: 'logs',
      section: 'manage',
      title: 'Logs',
      covers: 'Reading why a build failed or an app crashed',
      summary: 'The recent output of a server app. If the latest build failed, you get that build\'s log, which names the failing command.',
      done_when: 'You found the cause, fixed it, redeployed, and the app is live.',
      available: true,
      who: { connector: 'read_app · action "logs"', api: 'GET https://ship.embarko.ai/apps/{app-name}/logs', dashboard: `${SITE}/app`, needs_human: null },
      steps: {
        connector: ['Call read_app { action: "logs", appName, stream: "stderr" }.'],
        http_api: ['GET https://ship.embarko.ai/apps/{app-name}/logs?stream=stderr, with the token once the app is claimed.'],
      },
      examples: [{ title: 'Runtime logs', command: "curl -sS 'https://ship.embarko.ai/apps/my-app/logs?stream=stderr'", response_status: 200, response: { available: true, stream: 'stderr', logs: '...tail of recent output...' } }],
      limits: ['About the last 8KB; a snapshot, not a stream.', 'After a failed build the reply has source "build" and the build output.', 'Static sites have no logs (available: false).', 'If the log names _litestream_seq or _litestream_lock as unknown or about to be dropped, the start command runs a schema sync against a database Embarko keeps those tables in: see the data topic. Do not add a force flag.'],
      say_to_user: { failed: EXAMPLES.failed },
      prerequisites: prerequisites(base, [r('status', 'Logs explain a failed or crashed status')]),
      next: 'Fix what the log names and redeploy. Do not paste the log to the person unless they ask.',
      related: [r('deploy', 'Redeploy the fix'), r('rollback', 'Put the last good version back meanwhile'), r('feedback', 'If the log points at Embarko, not the app')],
      links: { logs: `${SHIP}/apps/{app-name}/logs` },
    },
    {
      topic: 'env-vars',
      section: 'manage',
      title: 'Secrets and settings',
      covers: 'API keys, secrets and config for a server app',
      summary: 'Environment variables for one app. Values are write-only: you can list the keys, never read a value back.',
      done_when: 'The feature that needs the value works.',
      available: true,
      who: { connector: 'update_app · set_env_vars / apply_env_vars; app_danger_zone · delete_env_var; read_app · env_vars', api: 'https://ship.embarko.ai/api/apps/{app-name}/env-vars', dashboard: `${SITE}/app/projects/{project-id}/environment`, needs_human: 'Only when a value is something only they have, such as their own API key.' },
      steps: {
        connector: [
          'Call update_app { action: "set_env_vars", appName, vars: [{ key, value }], apply: true }.',
          'If the person must type a secret themselves, send them to the app\'s App setup page rather than asking them to paste it into the chat (see Where the person adds a secret). If they already pasted a key in the chat, use it and suggest they rotate it later.',
        ],
        http_api: [
          'If the person must type a secret themselves, send them to the app\'s App setup page (see Where the person adds a secret).',
          'PUT https://ship.embarko.ai/api/apps/{app-name}/env-vars with the token and the body in the example below. It merges: keys you leave out stay as they are.',
          'If the person already pasted a key in the chat, use it and suggest they replace it with a new one later.',
          'One key: PUT https://ship.embarko.ai/api/apps/{app-name}/env-vars/{KEY} with {"value": "...", "apply": true}.',
          'Without "apply": true the value is only stored: POST https://ship.embarko.ai/api/apps/{app-name}/env-vars/apply (or redeploy).',
          'Order: if the code that reads the key is not deployed yet, store the value without apply, then deploy the new code (a deploy picks up stored values). If the code is already live, set it with apply.',
          'Send X-Agent-Name on any call that applies.',
        ],
      },
      secrets_page: {
        any_route: 'Tell them: open https://embarko.ai/app, choose the app, open App setup, and add {KEY} there. This works on every route, chat-only included.',
        direct_link: 'Over HTTP you can give the exact page: https://embarko.ai/app/projects/{project-id}/environment, where {project-id} is the id field of GET https://ship.embarko.ai/api/apps/{app-name} (with the token). No reply contains this link ready-made.',
      },
      limits: ['Keys match ^[A-Za-z_][A-Za-z0-9_]*$.', 'PORT, APP_NAME, APP_VERSION and DATA_DIR are set by Embarko, and so is CRON_SECRET for an app with schedules.', 'Static sites have no env vars (409 not_supported_for_static).', 'Over HTTP, the app must be claimed.'],
      examples: [
        {
          title: 'Set two values and apply them',
          body: { vars: [{ key: 'OPENAI_API_KEY', value: 'sk-...' }, { key: 'NOTIFY_EMAIL', value: 'sam@example.com' }], apply: true },
          command: "curl -sS -X PUT 'https://ship.embarko.ai/api/apps/my-app/env-vars' --oauth2-bearer $DEPLOY_TOKEN -H 'X-Agent-Name: {your-name}' -H 'Content-Type: application/json' --data @body.json",
        },
      ],
      errors: [
        { code: 'not_supported_for_static', status: 409, retry: 'No', do: 'Static site: put config in its files, or redeploy as a server app under a new name.' },
        { code: 'no_current_deployment', status: 422, retry: 'No', do: 'Values are saved. Deploy the app; do not write them again.' },
        { code: 'unauthorized', status: 401, retry: 'No', do: 'Bad token.' },
        ...PERMISSION_ERRORS,
      ],
      say_to_user: { missing: EXAMPLES.missing_secrets },
      prerequisites: prerequisites(base, [claimFirst]),
      next: 'Set the variables with apply, then check the app still works.',
      related: [r('status', 'Confirm it restarted fine'), r('logs', 'If it crashed after the change')],
      links: { list: `${API}/apps/{app-name}/env-vars`, apply: `${API}/apps/{app-name}/env-vars/apply`, secretsPage: `${SITE}/app/projects/{project-id}/environment` },
    },
    {
      topic: 'schedules',
      section: 'manage',
      title: 'Run something on a timer',
      covers: 'Daily reports, nightly clean-ups and reminders: Embarko calls a route of the app at the times you set',
      summary: 'List the schedules in the app\'s embarko.json file and Embarko calls those routes of the app on time, for example GET /tasks/daily-digest every weekday at 9:00. The job is normal app code in that route. Embarko keeps a record of each run, and emails the owner if a schedule starts failing.',
      done_when: 'Each schedule ran once with outcome "ok", and the person knows when it runs next.',
      available: true,
      who: { connector: 'deploy_app with embarko.json among the files. Running them once now is HTTP only, with a deploy token; the person can create one at https://embarko.ai/app/tokens', api: 'https://ship.embarko.ai/apps (embarko.json in the upload)', dashboard: `${SITE}/app: the app's Overview lists each scheduled job, its last and next run, and All runs. Read-only: no run-now or pause there.`, needs_human: 'Only their time zone, if you cannot tell it.' },
      steps: {
        any: [
          'Put the job in a GET route of the app, for example /tasks/daily-digest. Answer 2xx when it worked.',
          'First thing in that route: answer 401 unless the Authorization header is "Bearer " plus the CRON_SECRET env var. Embarko creates CRON_SECRET for the app; you never set or see it.',
          'Save anything the job must remember under DATA_DIR, not in memory: memory is not kept between runs.',
          'List the job under "schedules" in embarko.json, in the app\'s top folder (see the first example and embarko-json).',
          'Deploy as usual, any way. A bad schedule refuses the deploy before it builds; the error names the entry, e.g. "Schedule 1: ...".',
          'Check the test run. The skill runs each schedule once when the app is live and prints ok or the error. Over HTTP: POST links.runSchedules from the deploy reply, then poll each statusUrl until terminal is true.',
          'No HTTP (connector without a token, chat-only, upload page): you cannot run it now. Say so: the first real run is the test, they get an email if it fails, and they can see each run on the app\'s Overview at https://embarko.ai/app. Or ask for a deploy token (https://embarko.ai/app/tokens) and run it over HTTP if you can reach ship.embarko.ai.',
          'If a run failed, fix the route and deploy again.',
          'Tell the person when it runs, in their time zone.',
        ],
        manage: [
          'Change: edit embarko.json and deploy again. The list is the app\'s full set. A schedule keeps its history while its path stays the same.',
          'Remove one: delete it from the list and deploy. Remove all: "schedules": [].',
          'No embarko.json, or one without a "schedules" key: the schedules stay as they are.',
          'See runs: GET https://ship.embarko.ai/api/apps/{app-name}/schedules, then each schedule\'s links.runs. Newest first, 20 a page; add ?page=2, ?outcome=failed or ?trigger=schedule. The reply has total and totalPages. The last 100 runs of each schedule are kept.',
          'Pause one without a deploy: PATCH https://ship.embarko.ai/api/apps/{app-name}/schedules/{schedule-id} with {"enabled": false}. The next deploy that lists it turns it back on.',
          'Failure alerts to a webhook: PATCH the schedule with {"alertWebhookUrl": "https://..."}. The body is the JSON in the example, with no text field, so a Slack incoming webhook rejects it: point it at something that accepts any JSON.',
          'The person can see every schedule and run without the API: the app\'s Overview at https://embarko.ai/app, Scheduled jobs.',
        ],
      },
      fields: {
        cron: 'Required. Five fields: minute hour day-of-month month day-of-week. "0 9 * * 1-5" is 9:00 on weekdays. @hourly, @daily, @weekly, @monthly and @yearly also work.',
        path: 'Required. The route to call, starting with /. A query string is allowed: /tasks/cleanup?days=30. One schedule per path.',
        timezone: 'IANA name, such as Asia/Kolkata or Europe/London. Default UTC. Daylight saving is handled.',
        name: 'Optional, up to 100 characters. Shown in alert emails.',
      },
      receives: [
        'GET {path} on the app\'s own address, at each due time.',
        'Authorization: Bearer {CRON_SECRET}.',
        'X-Embarko-Schedule-Id and X-Embarko-Run-Id headers, and a User-Agent starting with Embarko-Scheduler/1.0.',
      ],
      run_outcomes: {
        running: 'The call is in progress. Keep polling.',
        ok: 'Final. The app answered 2xx.',
        failed: 'Final. Another status, no answer, a redirect, or no full answer within 5 minutes. error says which; responseExcerpt has the start of the app\'s reply.',
        skipped: 'Final. The previous run was still going when this one was due.',
      },
      alerts: [
        'The app\'s owner gets one email when a schedule starts failing, and one when it works again. Not one per failed run.',
        'Test runs count too: a failing test run can send that email.',
        'With alertWebhookUrl set, the same two events also go there as JSON (see the example).',
      ],
      examples: [
        {
          title: 'embarko.json, in the app\'s top folder',
          lang: 'json',
          code: EMBARKO_JSON_EXAMPLE,
          note: 'Next to package.json (or requirements.txt, go.mod...). Only the top folder is read.',
        },
        {
          title: 'Deploy with a schedule (skill)',
          command: './scripts/deploy.sh ./my-app my-app',
          note: 'Write embarko.json first. When the app is live the script prints a line per schedule, for example "/tasks/daily-digest: ok (200) Digest sent to 12 people", and any warnings. It exits 1 if a test run failed.',
        },
        {
          title: 'Deploy with a schedule (HTTP) → 202',
          command: "tar -czf /tmp/app.tar.gz --exclude=node_modules --exclude=.git --exclude='.env*' -C ./my-app .\ncurl -sS -X POST 'https://ship.embarko.ai/apps' --oauth2-bearer $DEPLOY_TOKEN -H 'X-App-Name: my-app' -H 'X-Agent-Name: {your-name}' -F 'source=@/tmp/app.tar.gz'",
          note: 'The normal deploy. embarko.json travels inside the .tar.gz; in a JSON upload it is one of the files.',
          response_status: 202,
          response: { success: true, status: 'building', app: { name: 'my-app', kind: 'service', claimed: true }, schedules: { declared: 1, appliesWhen: 'live' }, next: 'Building: poll links.status every 10 seconds until it says "live", "failed" or "crashed". Once live, its schedule runs on time; POST links.runSchedules (deploy token) to run it once now, and tell the user it works only when each run\'s outcome is "ok".', links: { status: 'https://ship.embarko.ai/apps/my-app/status', feedback: 'https://ship.embarko.ai/apps/my-app/customer-query', runSchedules: 'https://ship.embarko.ai/api/apps/my-app/schedules/run' } },
        },
        {
          title: 'Run them once now (HTTP) → 202, then poll',
          command: "curl -sS -X POST 'https://ship.embarko.ai/api/apps/my-app/schedules/run' --oauth2-bearer $DEPLOY_TOKEN\ncurl -sS 'https://ship.embarko.ai{statusUrl}' --oauth2-bearer $DEPLOY_TOKEN",
          note: 'Poll each statusUrl every 5 seconds until terminal is true. Done looks like {"outcome": "ok", "httpStatus": 200, "responseExcerpt": "Digest sent to 12 people", "terminal": true}.',
          response_status: 202,
          response: { runs: [{ scheduleId: 'cmgv2k8w0000108l4schd7x2a', path: '/tasks/daily-digest', id: 'cmgv2m1qa000308l4run9f3kd', trigger: 'manual', outcome: 'running', terminal: false, httpStatus: null, error: null, responseExcerpt: null, startedAt: '2026-10-17T10:01:00.000Z', finishedAt: null, durationMs: null, statusUrl: '/api/apps/my-app/schedules/cmgv2k8w0000108l4schd7x2a/runs/cmgv2m1qa000308l4run9f3kd' }] },
        },
        {
          title: 'The route, with the CRON_SECRET check (Node, Express)',
          lang: 'js',
          code: [
            "app.get('/tasks/daily-digest', async (req, res) => {",
            "  if (req.get('authorization') !== 'Bearer ' + process.env.CRON_SECRET) return res.sendStatus(401);",
            '  const sent = await sendDailyDigests(); // keep progress under DATA_DIR',
            "  res.send('Digest sent to ' + sent + ' people'); // kept as responseExcerpt",
            '});',
          ].join('\n'),
          note: 'Any other language: compare the Authorization header with "Bearer " plus CRON_SECRET and answer 401 if they differ. For work longer than 5 minutes, answer 202 at once and carry on in the background.',
        },
        {
          title: 'Alert webhook payload',
          lang: 'json',
          code: JSON.stringify({ event: 'schedule.failed', app: { name: 'my-app', url: 'https://my-app.embarko.app' }, schedule: { id: 'cmgv2k8w0000108l4schd7x2a', name: 'daily digest', cron: '0 9 * * 1-5', timezone: 'Asia/Kolkata', path: '/tasks/daily-digest' }, run: { id: 'cmgv3a7pe000508l4run2h6qz', trigger: 'schedule', outcome: 'failed', terminal: true, httpStatus: 500, error: 'HTTP 500', responseExcerpt: 'Error: SMTP login failed', startedAt: '2026-10-19T03:30:00.412Z', finishedAt: '2026-10-19T03:30:01.224Z', durationMs: 812 }, consecutiveFailures: 1, sentAt: '2026-10-19T03:30:01.300Z' }),
          note: 'event is schedule.failed or schedule.recovered.',
        },
      ],
      limits: [
        'Up to 5 schedules per app, at most once every 5 minutes each.',
        'Each call has 5 minutes to finish.',
        'Redirects are not followed and count as failed.',
        'The first 2KB of each reply and the last 100 runs of each schedule are kept.',
        'A time missed during an Embarko outage runs once when it can. Missed times are not replayed.',
        'Needs a kept app: claimed over HTTP, deployed through the connector, or uploaded in the dashboard. A temporary app deploys, but its schedules are not applied; the reply says so.',
        'Static sites cannot have schedules. A static site deploys, with the warning schedules_on_static_site.',
        'Schedules apply only when the deploy succeeds.',
        'embarko.json is the source of truth: a schedule paused or changed through the API is set back by the next deploy whose embarko.json lists it.',
        'A deploy with no schedules in embarko.json whose code lists a timer library (node-cron, node-schedule, APScheduler, rufus-scheduler...) goes ahead with the warning in_process_timer, and quotes any timing it found in the code. Move those jobs here.',
        'If the app has schedules and the upload declares none, the reply warns schedules_unchanged: they were kept.',
      ],
      errors: [
        { code: 'invalid_embarko_json', status: 400, retry: 'No', do: 'The file is not valid JSON (the message gives line and column), not one object, "schedules" is not a list, or it is over 64 KB. Fix it and deploy again.' },
        { code: 'secrets_in_embarko_json', status: 400, retry: 'No', do: 'The file looks like it holds a secret. Remove it; use an env var. The route checks CRON_SECRET, which Embarko creates.' },
        { code: 'invalid_schedules', status: 400, retry: 'No', do: 'An entry in "schedules" has the wrong shape: cron or path missing, or a field of the wrong type. The message names it, e.g. (0.path: Required). Fix it and deploy again.' },
        { code: 'invalid_cron', status: 400, retry: 'No', do: 'Use five fields (minute hour day-of-month month day-of-week), or @daily and the like.' },
        { code: 'schedule_too_frequent', status: 400, retry: 'No', do: 'Two runs would be less than 5 minutes apart. Space them out.' },
        { code: 'invalid_timezone', status: 400, retry: 'No', do: 'Use an IANA name such as UTC or Asia/Kolkata.' },
        { code: 'invalid_path', status: 400, retry: 'No', do: 'A path on the app starting with /, with no host, spaces or #.' },
        { code: 'duplicate_schedule_path', status: 400, retry: 'No', do: 'Two schedules call the same path. Give each its own route.' },
        { code: 'schedule_limit_reached', status: 400, retry: 'No', do: 'More than 5 schedules. Combine some jobs into one route.' },
        { code: 'no_schedules', status: 404, retry: 'Yes, once', do: 'On run-now right after going live: wait 5 seconds and try again. Still 404: the deploy\'s embarko.json listed no schedules.' },
        { code: 'run_in_progress', status: 409, retry: 'Later', do: 'That schedule\'s last run has not finished. Poll it, then try again.' },
        { code: 'invalid_alert_webhook', status: 400, retry: 'No', do: 'alertWebhookUrl must be a public https:// address.' },
        { code: 'not_supported_for_static', status: 409, retry: 'No', do: 'A static site has no server to call. Deploy it as a server app under a new name.' },
        ...PERMISSION_ERRORS,
      ],
      say_to_user: { done: 'Done: every weekday at 9:00 your app sends the digest. I ran it once just now and it worked. If it ever stops working, Embarko emails you.' },
      prerequisites: prerequisites(base, [claimFirst]),
      next: 'Write the route with the CRON_SECRET check, list it in embarko.json, deploy, and check the test run.',
      related: [r('embarko-json', 'The file the schedules are listed in'), r('deploy', 'The deploy that reads it'), r('logs', 'When a run fails'), r('static-sites', 'Why a static site cannot have one')],
      links: { deploy: `${SHIP}/apps`, runSchedules: `${API}/apps/{app-name}/schedules/run`, schedules: `${API}/apps/{app-name}/schedules`, tokensPage: `${SITE}/app/tokens` },
    },
    {
      topic: 'custom-domain',
      section: 'manage',
      title: 'Own domain',
      covers: 'Using the person\'s own domain, including the DNS step they have to do',
      summary: 'Point a domain or subdomain at the app. HTTPS is set up automatically once DNS is in place.',
      done_when: 'https://{their domain} opens the app.',
      available: true,
      who: { connector: 'update_app · register_domain / verify_domain; app_danger_zone · delete_domain; read_app · domains', api: 'https://ship.embarko.ai/api/apps/{app-name}/domains', dashboard: `${SITE}/app/projects/{project-id}/domain`, needs_human: 'Adding one DNS record wherever their domain is managed.' },
      steps: {
        connector: [
          'Call update_app { action: "register_domain", appName, domain }. The reply\'s instructions field is the DNS record.',
          'Give the person that one record in plain words (type, name, value) and where it goes ("your domain provider\'s DNS settings").',
          'When they say it is done, call update_app { action: "verify_domain", appName, domain }. A 422 means DNS has not reached Embarko yet: try again in a few minutes.',
        ],
        http_api: [
          'POST https://ship.embarko.ai/api/apps/{app-name}/domains with the token and the body {domain}. The reply\'s instructions field is the one DNS record the person must add.',
          'Once the record is added: POST https://ship.embarko.ai/api/apps/{app-name}/domains/{domain}/verify. Safe to repeat.',
        ],
        dashboard: [
          'For any app in the person\'s account, including one they uploaded in the dashboard, and when you cannot reach the API: they do it themselves in the dashboard.',
          'Tell them: open https://embarko.ai/app, choose the app, open the Domain tab, and enter the domain.',
          'The page shows the one DNS record to add at their domain provider. After adding it they press Verify; if DNS is not ready yet, they wait a few minutes and press it again. It works the same as the API route above.',
        ],
      },
      limits: ['A root domain gets an A record, a subdomain a CNAME.', 'One domain belongs to one app.'],
      errors: [
        { code: 'domain_taken', status: 409, retry: 'No', do: 'Another app has it.' },
        { code: 'domain_reserved', status: 400, retry: 'No', do: 'An Embarko address (*.embarko.app) cannot be registered.' },
        { code: 'invalid_domain', status: 400, retry: 'No', do: 'Not a valid domain name.' },
        { code: '(DNS not ready)', status: 422, retry: 'Later', do: 'On verify: wait a few minutes and verify again.' },
        ...PERMISSION_ERRORS,
      ],
      say_to_user: { ask_dns: 'To use {domain}, add this one record in your domain provider\'s DNS settings: {type} {name} → {value}. Tell me when it\'s done.', done: '{domain} now opens your app.' },
      prerequisites: prerequisites(base, [claimFirst]),
      next: 'Register the domain, give the person the DNS record, verify when they are done.',
      related: [r('resume', 'Domain states: pending_dns, active or failed'), r('rename', 'A custom domain keeps working through a rename')],
      links: { register: `${API}/apps/{app-name}/domains`, verify: `${API}/apps/{app-name}/domains/{domain}/verify` },
    },
    {
      topic: 'rollback',
      section: 'manage',
      title: 'Undo a bad update',
      covers: 'Putting an earlier working version back, without a rebuild',
      summary: 'Switch the app back to an earlier successful deploy, with no rebuild. With no deploymentId it goes to the most recent successful deploy that is not the current one. It keeps today\'s env vars and domains, and DATA_DIR is not rolled back: older code runs against today\'s data. A feature added after that version (such as a login) is gone until you redeploy.',
      done_when: 'The previous version is serving and works.',
      available: true,
      who: { connector: 'update_app · rollback; read_app · deployments', api: 'POST https://ship.embarko.ai/api/apps/{app-name}/rollback', dashboard: `${SITE}/app`, needs_human: null },
      steps: {
        connector: ['Call update_app { action: "rollback", appName } for the previous version. If the newest successful deploy is itself the broken one, call read_app { action: "deployments", appName } and pass the deploymentId of the last deploy before the problem started.', 'Anything added after that version (such as a login) disappears until you redeploy a fixed version: tell the person.'],
        http_api: [
          'Optional: GET https://ship.embarko.ai/api/apps/{app-name}/deployments to pick one (rollbackTarget: true marks valid ones). If the latest successful deploy is itself the broken one, pick the one before it: deploys are newest first, so take the first rollbackTarget entry older than the deploy where the problem started (compare times and versions).',
          'POST https://ship.embarko.ai/api/apps/{app-name}/rollback with {} or {"deploymentId": "..."}, the token and X-Agent-Name.',
          'The reply is 202 with statusUrl: poll it until terminal is true.',
        ],
      },
      limits: ['Only the last 5 builds are kept.'],
      errors: [
        { code: 'no_rollback_target', status: 422, retry: 'No', do: 'No earlier good deploy. Fix forward instead.' },
        { code: 'rollback_image_unavailable', status: 422, retry: 'No', do: 'That version is too old to restore; retainCount says how far back you can go.' },
        { code: 'unauthorized', status: 401, retry: 'No', do: 'Bad token.' },
        ...PERMISSION_ERRORS,
      ],
      say_to_user: { done: 'I put the previous version back, so your app works again. I\'ll fix the new version next.' },
      prerequisites: prerequisites(base, [claimFirst]),
      next: 'Roll back when the app is down and the cause is not clear yet, then fix and redeploy.',
      related: [r('logs', 'Find out what broke'), r('deploy', 'Redeploy the fix')],
      links: { history: `${API}/apps/{app-name}/deployments`, rollback: `${API}/apps/{app-name}/rollback` },
    },
    {
      topic: 'analytics',
      section: 'manage',
      title: 'How is it doing?',
      covers: 'Traffic, errors and memory use, summed up for the person',
      summary: 'Requests, errors and resource use for a time range.',
      done_when: 'You told the person how it is doing in one sentence.',
      available: true,
      who: { connector: 'read_app · action "analytics"', api: 'GET https://ship.embarko.ai/api/apps/{app-name}/analytics?range=7d', dashboard: `${SITE}/app`, needs_human: null },
      steps: {
        connector: ['Call read_app { action: "analytics", appName, range: "7d" }. range is 24h, 7d, 30d, 90d or all.'],
        http_api: ['GET https://ship.embarko.ai/api/apps/{app-name}/analytics?range=7d with the token.'],
      },
      errors: [{ code: '(unavailable)', status: 503, retry: 'Once', do: 'Retry once after 2 seconds. Still 503: analytics is down right now, which does not mean zero visitors. Say that, and offer to check later.' }],
      say_to_user: { summary: 'About 1,200 visits this week, no errors. It\'s running comfortably.' },
      prerequisites: prerequisites(base, [claimFirst]),
      next: 'Summarise in the person\'s terms, not raw numbers.',
      related: [r('status', 'Is it up right now')],
      links: { analytics: `${API}/apps/{app-name}/analytics?range=7d` },
    },
    {
      topic: 'rename',
      section: 'manage',
      title: 'Change the web address',
      covers: 'Moving the app to a new {name}.embarko.app address',
      summary: 'Changes the app\'s address. The old address stops working and does not redirect. The old name stays the app\'s: nobody else can take it, and a deploy under it reaches the renamed app. Custom domains keep working. Changing only the display name is a different, harmless call.',
      done_when: 'The new address opens the app, and you use the new name from now on.',
      available: true,
      who: { connector: 'app_danger_zone · rename_app; read_app · rename_status', api: 'POST https://ship.embarko.ai/api/apps/{app-name}/slug-change', dashboard: `${SITE}/app`, needs_human: 'Confirm first: links already shared will stop working.' },
      steps: {
        connector: ['Confirm with the person. Call app_danger_zone { action: "rename_app", appName, newName }. If terminal is false, poll read_app { action: "rename_status", projectId }.', 'Use the new name in every call from now on.'],
        http_api: [
          'Confirm with the person. POST https://ship.embarko.ai/api/apps/{app-name}/slug-change with {"newName": "..."} and the token.',
          'A live app replies 202 with projectId: poll GET https://ship.embarko.ai/api/slug-changes/{project-id} until terminal is true. It takes minutes. From then on use the name in the reply\'s deployWith.',
          'Display name only: PATCH https://ship.embarko.ai/api/apps/{app-name} with {"name": "My App"}. The address does not change.',
        ],
      },
      errors: [
        { code: 'app_name_taken / app_name_reserved', status: 409, retry: 'No', do: 'Pick another name.' },
        { code: 'deploy_in_progress / rename_in_progress', status: 409, retry: 'Later', do: 'Wait for it to finish.' },
        { code: 'slug_change_cooldown', status: 429, retry: 'Later', do: 'One change per app per week; retryAfterMs says when.' },
        { code: 'app_state_unknown', status: 503, retry: 'Once', do: 'Retry once after 2 seconds.' },
        { code: 'rename_failed', status: 502, retry: 'Once', do: 'Nothing changed. Try once more.' },
        { code: 'rename_desynced', status: 500, retry: 'No', do: 'Needs the Embarko team: report it.' },
        ...PERMISSION_ERRORS,
      ],
      say_to_user: { confirm: 'Your app will move to {new}.embarko.app. The old link stops working right away with no redirect. Your custom domain and Showcase listing move with it. You can change the address only once a week. Go ahead?', done: 'Done: your app is now at {link}.' },
      prerequisites: prerequisites(base, [claimFirst]),
      next: 'Ask first, then rename.',
      related: [r('showcase', 'A Showcase listing follows the rename'), r('custom-domain', 'A custom domain is unaffected')],
      links: { rename: `${API}/apps/{app-name}/slug-change`, progress: `${API}/slug-changes/{project-id}` },
    },
    {
      topic: 'delete',
      section: 'manage',
      title: 'Delete an app',
      covers: 'Removing an app for good',
      summary: 'Deletes the app with its deploys, env vars, domains and Showcase listing. Its name becomes free for anyone to take. There is no backup and no undo. If it had a custom domain, the person can remove that DNS record afterwards.',
      done_when: 'The delete call answered 204. A status check for that name then answers not_deployed, or 404 not_found when you send a token: either means it is gone.',
      available: true,
      who: { connector: 'app_danger_zone · delete_app (with confirmAppName)', api: 'DELETE https://ship.embarko.ai/api/apps/{app-name}', dashboard: `${SITE}/app`, needs_human: 'Always confirm, naming the app.' },
      steps: {
        connector: ['Confirm with the person by name. Call app_danger_zone { action: "delete_app", appName, confirmAppName } with confirmAppName equal to appName.'],
        http_api: ['Confirm with the person. DELETE https://ship.embarko.ai/api/apps/{app-name} with {"confirmAppName": "{app-name}"} and the token. 204 means deleted.'],
      },
      errors: [{ code: 'confirmation_required', status: 400, retry: 'No', do: 'confirmAppName missing or different. Nothing was deleted.' }, ...PERMISSION_ERRORS],
      say_to_user: { confirm: 'This deletes {app} for good: its deploys, settings, custom domains and Showcase listing. There is no undo, and the name becomes free for anyone. Delete it?', done: '{app} is deleted.' },
      prerequisites: prerequisites(base, [claimFirst]),
      next: 'Only on an explicit yes.',
      related: [r('rollback', 'If the person only wants the old version back')],
      links: { delete: `${API}/apps/{app-name}` },
    },

    // ------------------------------------------------------------- 6 SHOWCASE
    {
      topic: 'showcase',
      section: 'showcase',
      title: 'List it on Showcase',
      covers: 'The public gallery of AI-built apps, and event pages',
      summary: 'Showcase is a public gallery of apps built with AI. One listing per app, reused on the public page and on event pages. Act only when the person wants it listed.',
      done_when: 'The listing page opens, or the event listing is waiting for the organiser and the person knows.',
      available: true,
      who: { connector: 'Not in the connector yet. Connector apps have no deploy token: give the person the approved draft and send them to https://embarko.ai/app/showcase/submit', api: 'PUT https://ship.embarko.ai/api/apps/{app-name}/showcase', dashboard: `${SITE}/app/showcase/submit`, needs_human: 'The person confirms the listing before it goes public.' },
      steps: {
        http_api: [
          'GET https://ship.embarko.ai/api/public/showcase/apps/{app-name} (no token). 404 means not listed yet; otherwise reuse what is there and send only changes.',
          'Draft name, tagline, description, category and tags from the app itself.',
          'Ask once for what only the person knows: their name or profile link, who else built it, screenshots or a video, and the event page and code if it is for an event. Never invent these.',
          'Show them the draft and get a yes, then send it (example below). Only the fields you send change, so a retry is safe.',
          'The reply\'s status says what happened. approved: give them https://embarko.ai/showcase/app/{app-name}. pending: the event organiser must approve (a valid code skips this; events with auto-approve on never wait). rejected: next gives the reason.',
        ],
      },
      examples: [
        {
          title: 'List an app on an event page',
          body: { collectionSlug: 'walkover-hack-2026', code: 'WH26', tagline: 'Live voting for hackathon demos, built in a day', creatorName: 'Ravi Kumar', builtWith: 'Claude', category: 'Productivity', description: 'What it does and who it is for.', videoUrl: 'https://youtu.be/abc123' },
          command: "curl -sS -X PUT 'https://ship.embarko.ai/api/apps/my-app/showcase' --oauth2-bearer $DEPLOY_TOKEN -H 'Content-Type: application/json' --data @body.json",
          note: 'Leave out collectionSlug and code for the public gallery. Reply: 201 the first time, 200 after, with the listing, its status and a one-line next.',
        },
      ],
      fields: {
        tagline: 'Required on first listing. One line, 60-160 characters.',
        creatorName: 'Required on first listing.',
        collectionSlug: 'Event page slug: the last part of the event page link (embarko.ai/showcase/{slug}). Ask the person for that link; never guess it. Leave out for the public gallery.',
        code: 'Event submit code, if the organiser gave one.',
        name: 'Page title. Also changes the app\'s display name in the dashboard (not its address): leave it out unless the person wants that.',
        description: 'Up to 4,000 characters.',
        story: 'Up to 600 characters.',
        creatorProfile: 'An https link.',
        contributorEmails: 'Up to 10, the person listing first. Ask before sending.',
        builtWith: 'Claude, Codex, Cursor, Lovable, Replit, or another.',
        category: 'AI Tool, Personal, Business, Productivity, Education, Game, Developer Tool, Other.',
        tags: 'Up to 8.',
        screenshotUrls: 'Up to 10 https images; the first is the card image.',
        videoUrl: 'A demo video link.',
        customHtml: 'Up to 50,000 characters.',
      },
      errors: [
        { code: 'SHOWCASE_COLLECTION_UNKNOWN', status: 404, retry: 'No', do: 'Wrong event slug.' },
        { code: 'SHOWCASE_COLLECTION_PRIVATE', status: 403, retry: 'No', do: 'Another company\'s event page.' },
        { code: 'unauthorized', status: 401, retry: 'No', do: 'Bad token, or the app is not claimed.' },
        ...PERMISSION_ERRORS,
      ],
      say_to_user: { confirm: 'Here\'s how your app will look on Showcase: {draft}. Publish it?', done: 'Your app is on Showcase: {link}.' },
      prerequisites: prerequisites(base, [r('deploy', 'The app must be live'), r('claim', 'Over HTTP the app must be claimed: Showcase uses its deploy token', 'over HTTP only')]),
      next: 'Check it is live and claimed, draft the listing, confirm, publish.',
      related: [r('rename', 'The listing follows a rename'), r('feedback', 'If a listing will not publish')],
      links: { existing: `${API}/public/showcase/apps/{app-name}`, submit: `${API}/apps/{app-name}/showcase`, showcase: `${SITE}/showcase`, appPage: `${SITE}/showcase/app/{app-name}` },
    },

    // ------------------------------------------------------------- 7 FEEDBACK
    {
      topic: 'feedback',
      section: 'feedback',
      title: 'Report a problem or request a feature',
      covers: 'Telling the Embarko team about a bug, a missing feature or wrong docs',
      summary: 'When Embarko itself fails, lacks something the app needs, or the docs are wrong, report it with a type. Do not work around it silently.',
      done_when: 'The report was accepted and you told the person in one line.',
      available: true,
      types: {
        platform_bug: 'Embarko itself misbehaved.',
        missing_capability: 'A feature request: the app needs something Embarko does not have.',
        docs_issue: 'These docs were wrong or unclear.',
        unexpected_behavior: 'It worked, but not as documented.',
        other: 'Anything else.',
      },
      who: { connector: 'update_app · submit_feedback', api: 'POST https://ship.embarko.ai/apps/{app-name}/customer-query', dashboard: null, needs_human: null },
      steps: {
        connector: ['Call update_app { action: "submit_feedback", appName, feedbackType, message }.'],
        http_api: [
          'About an app: POST https://ship.embarko.ai/apps/{app-name}/customer-query with the header X-Agent-Name and the body {type, message}. Token once the app is claimed.',
          'Not about an app (or before it exists): POST https://ship.embarko.ai/api/public/customer-query with the body {type, message, email}. A reply for an app that does not exist yet links here as links.feedback, which is why you may see either address.',
        ],
      },
      limits: ['message: 1-5,000 characters.', 'Public route: 10 per email and 20 per IP.'],
      errors: [
        { code: '(missing X-Agent-Name)', status: 400, retry: 'No', do: 'Add the header.' },
        { code: 'invalid_feedback_type', status: 400, retry: 'No', do: 'Use one of types.' },
        { code: '(rate limited)', status: 429, retry: 'Later', do: 'Do not resend; mention it to the person instead.' },
        { code: '(transient)', status: 502, retry: 'Once', do: 'Retry once.' },
      ],
      say_to_user: { reported: 'This looks like a problem on Embarko\'s side. I\'ve reported it to their team.' },
      prerequisites: prerequisites(base),
      next: 'Report with the right type, then tell the person in one line.',
      related: [r('logs', 'Check it is not the app first')],
      links: { app: `${SHIP}/apps/{app-name}/customer-query`, public: `${API}/public/customer-query` },
    },
  ];
}

const ALIASES = {
  connector: 'connectors', mcp: 'connectors',
  start: 'prerequisites', about: 'prerequisites', 'before-you-start': 'prerequisites', 'not-supported': 'prerequisites',
  login: 'app-login', auth: 'app-login', private: 'app-login', password: 'app-login', users: 'app-login',
  state: 'resume', continue: 'resume', handoff: 'resume',
  domains: 'custom-domain', domain: 'custom-domain', dns: 'custom-domain',
  secrets: 'env-vars', env: 'env-vars', 'api-keys': 'env-vars',
  'embarko.json': 'embarko-json', embarko: 'embarko-json', config: 'embarko-json', 'embarko-config': 'embarko-json',
  schedule: 'schedules', cron: 'schedules', 'cron-jobs': 'schedules', 'scheduled-tasks': 'schedules', timer: 'schedules',
  database: 'data', sqlite: 'data', files: 'data', storage: 'data',
  keep: 'claim', token: 'claim', permanent: 'claim', tokens: 'claim', 'move-app': 'claim', workspace: 'claim',
  undo: 'rollback', 'change-address': 'rename', 'slug-change': 'rename',
  traffic: 'analytics', retry: 'errors', retries: 'errors', 'error-codes': 'errors', report: 'feedback', bug: 'feedback', 'feature-request': 'feedback',
  static: 'static-sites', frontend: 'two-apps', backend: 'two-apps', monorepo: 'two-apps', api: 'two-apps', listing: 'showcase', errors: 'deploy', polling: 'status',
};

export { SHIP, API, SITE, VERSION, SECTIONS, ROUTES, TALK_RULE, DOMAINS, RETRY, BACKOFF, RESERVED_EXAMPLES, topics, ALIASES };
