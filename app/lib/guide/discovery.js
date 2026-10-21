/**
 * The machine-readable files an agent (or a crawler working for one) looks
 * for before it reads any docs: the agent manifest, an A2A agent card, an
 * RFC 9727 API catalog, llms.txt and the OpenAPI spec.
 *
 * Everything is built from content.js, so a new topic shows up here without
 * being written twice.
 */

import { SHIP, API, SITE, VERSION, SECTIONS, topics } from './content';

function agentJson(base) {
  return {
    schema_version: '1.0',
    name: 'Embarko',
    description: 'Hosting for apps built by AI agents. Deploy from the chat; get a live link at {app-name}.embarko.app.',
    url: SITE,
    version: VERSION,
    provider: { name: 'Embarko', url: SITE },
    audience: 'The person asking is usually not a developer. Reply in plain words; never show them commands, tokens or logs.',
    capabilities: [
      'Deploy static websites and one-process server apps (Node, Python, Go, Ruby, PHP, Rust, Java) with no Dockerfile.',
      'Deploy without an account: the app is live at once and kept for 24 hours unless claimed.',
      'Check status and read build and runtime logs.',
      'Set secrets and config (env vars) without redeploying.',
      'Call a route of the app on a cron schedule, listed in the app\'s embarko.json file, with run history and failure alerts.',
      'Connect a custom domain with automatic HTTPS.',
      'Roll back to any of the last 5 successful builds.',
      'Read traffic and usage analytics.',
      'Rename an app\'s address or delete it.',
      'List the app on the public Showcase gallery or an event page.',
      'Send bug reports and feature requests to the Embarko team.',
    ],
    not_supported: ['WebSockets', 'Background workers or several processes per app', 'Managed databases', 'Backups'],
    use_cases: [
      'Put an app or website an AI just built online at a shareable link.',
      'Update a live app after changing its code.',
      'Find out why an app is down and fix it.',
      'Use the person\'s own domain for their app.',
      'Run a job in the app at set times, such as a daily report: list the schedule in the app\'s embarko.json and deploy.',
      'Show the app in a public gallery or at a hackathon.',
    ],
    how_to_connect: [
      { order: 1, route: 'mcp_connector', when: 'An Embarko connector is in your tools.', docs: `${base}/docs/prerequisites` },
      { order: 2, route: 'http_api', when: 'You can run commands and reach ship.embarko.ai.', docs: `${base}/docs/quickstart` },
      { order: 3, route: 'connect_first', when: 'You cannot reach the internet: ask the person to add the connector.', docs: `${SITE}/docs/connectors` },
      { order: 4, route: 'upload', when: 'Last resort: give the person a .zip to upload at embarko.ai/app.', docs: `${base}/docs/prerequisites` },
    ],
    auth: {
      anonymous: { supported: true, note: 'First deploy needs no credential; the app is deleted after 24 hours unless claimed.' },
      connector: { type: 'oauth', note: 'The person signs in once when adding the connector. No token for the agent to handle.' },
      deploy_token: {
        type: 'bearer',
        header: 'Authorization: Bearer {DEPLOY_TOKEN}',
        request: `POST ${API}/public/deploy-tokens/request {"email"} (token is emailed to the person, never returned)`,
        dashboard: `${SITE}/app/tokens`,
        stored_in: ['DEPLOY_TOKEN', '~/.embarko/credentials'],
      },
    },
    protocols: {
      mcp: {
        supported: true,
        tools: ['deploy_app', 'read_app', 'update_app', 'app_danger_zone'],
        connect: `${SITE}/docs/connectors`,
        clients: { claude: 'https://claude.ai/directory/embarko' },
      },
      openapi: { supported: true, url: `${base}/openapi.json`, },
      a2a_rpc: { supported: false },
    },
    api: { deploy_base_url: SHIP, api_base_url: API, openapi_url: `${base}/openapi.json` },
    agent_resources: {
      guide: `${base}/docs`,
      guide_markdown: `${base}/docs/index.md`,
      llms_txt: `${base}/llms.txt`,
      pricing: `${SITE}/pricing`,
      api_catalog: `${base}/.well-known/api-catalog`,
      agent_card: `${base}/.well-known/agent-card.json`,
    },
    skill: {
      repository_url: 'https://github.com/embarko-ai/skill',
      install: 'npx skills add embarko-ai/skill --skill embarko-deploy -g',
      script: 'https://raw.githubusercontent.com/embarko-ai/skill/main/scripts/deploy.sh',
    },
    support: { feedback: `${base}/docs/feedback`, contact: `${SITE}/support` },
  };
}

// A2A agent card (protocol 0.3). Embarko has no A2A endpoint; the card is for
// discovery, and says so, like the competitor's.
function agentCard(base) {
  const skill = (id, name, description, tags, examples) => ({ id, name, description, tags, examples });
  return {
    protocolVersion: '0.3.0',
    name: 'Embarko',
    description: 'Hosting for AI-built apps. Deploy, check, fix and share apps at {app-name}.embarko.app.',
    url: `${base}/docs`,
    version: VERSION,
    provider: { organization: 'Embarko', url: SITE },
    documentationUrl: `${base}/docs`,
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
    defaultInputModes: ['application/json'],
    defaultOutputModes: ['application/json', 'text/markdown'],
    securitySchemes: { deployToken: { type: 'http', scheme: 'bearer' } },
    skills: [
      skill('deploy', 'Deploy an app', 'Put a website or one-process server app online with no Dockerfile.', ['deploy', 'hosting'], ['Deploy this app to Embarko', 'Put my site online']),
      skill('manage', 'Manage a live app', 'Status, logs, env vars, schedules, custom domains, rollback, analytics, rename, delete.', ['logs', 'domains', 'secrets', 'schedules'], ['Why is my app down?', 'Use my own domain', 'Send the report every Monday at 9']),
      skill('showcase', 'Showcase', 'List the app in the public gallery or on an event page.', ['showcase', 'gallery'], ['Put my app on the Embarko Showcase']),
      skill('feedback', 'Feedback', 'Report a bug or request a feature.', ['support'], ['Tell Embarko this is broken']),
    ],
    a2aEndpoint: null,
  };
}

// RFC 9727: one linkset that names every machine-readable resource.
function apiCatalog(base) {
  return {
    linkset: [
      {
        anchor: SHIP,
        'service-desc': [{ href: `${base}/openapi.json`, type: 'application/vnd.oai.openapi+json;version=3.1' }],
        'service-doc': [
          { href: `${base}/docs/index.json`, type: 'application/json', title: 'Agent guide (contents)' },
          { href: `${SITE}/docs`, type: 'text/html', title: 'Human docs' },
        ],
        describedby: [
          { href: `${base}/llms.txt`, type: 'text/plain', title: 'Concise agent context' },
          { href: `${base}/.well-known/agent.json`, type: 'application/json', title: 'Agent discovery manifest' },
          { href: `${base}/.well-known/agent-card.json`, type: 'application/json', title: 'A2A agent card' },
        ],
      },
    ],
  };
}

function llmsTxt(base) {
  const all = topics(base);
  const lines = [
    '# Embarko',
    '',
    '> Hosting for apps built by AI agents. Deploy from the chat and get a live link at {app-name}.embarko.app. The person asking is usually not a developer: reply in plain words.',
    '',
    `Start with the quickstart: ${base}/docs/quickstart.md. Open one topic at a time; the rules for talking to the person are in ${base}/docs/prerequisites.md.`,
    '',
  ];
  for (const s of SECTIONS) {
    lines.push(`## ${s.n}. ${s.name}`, '');
    for (const tp of all.filter((x) => x.section === s.id)) lines.push(`- [${tp.title}](${base}/docs/${tp.topic}.md): ${tp.covers}`);
    lines.push('');
  }
  lines.push('## Machine-readable', '', `- [Agent manifest](${base}/.well-known/agent.json)`, `- [API catalog](${base}/.well-known/api-catalog)`, `- [OpenAPI](${base}/openapi.json)`, `- [Pricing](${SITE}/pricing)`, '');
  lines.push('## Security, data and policies', '',
    'Region selection is not available and the region an app runs in is not guaranteed. Do not tell the person which country their app or its data is in; if data residency matters, point them at the DPA before they deploy.', '',
    `- [Security](${SITE}/security)`, `- [Data processing agreement](${SITE}/dpa)`, `- [Privacy](${SITE}/privacy)`,
    `- [Terms](${SITE}/terms): hosting content the person has no right to publish, mining, proxying and load generation are not allowed.`,
    `- [Status](${SITE}/status)`, `- [Support](${SITE}/support)`, `- [Report abuse](${SITE}/abuse)`);
  return lines.join('\n');
}

// OpenAPI 3.1 for every endpoint the guide describes.
// Every error body has the same shape: { error, code, next?, links? }.
function openapi() {
  const json = (schema) => ({ 'application/json': { schema } });
  const body = (schema, required = true) => ({ required, content: json(schema) });
  const ok = (description, schema) => (schema ? { description, content: json(schema) } : { description });
  const err = (description) => ({ description, content: json({ $ref: '#/components/schemas/Error' }) });
  const p = (name, extra = {}) => ({ name, in: 'path', required: true, schema: { type: 'string' }, ...extra });
  const appName = p('appName', { schema: { type: 'string', pattern: '^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$' } });
  const agentHeader = { name: 'X-Agent-Name', in: 'header', schema: { type: 'string', maxLength: 60 }, description: 'Your agent name, e.g. codex. Recorded in deploy history.' };
  const token = [{ deployToken: [] }];
  const optionalToken = [{ deployToken: [] }, {}];
  const common = { 401: err('unauthorized: token invalid or revoked'), 403: err('permission_denied: the token\'s owner is not allowed this (body names permission and role); token_owner_not_member: whoever made the token left the workspace'), 404: err('Unknown app, or not yours'), 429: err('Rate limited: back off') };

  return {
    openapi: '3.1.0',
    info: {
      title: 'Embarko API',
      version: VERSION,
      description: 'Deploy and manage apps on Embarko. Guide: https://embarko.ai/docs. Retry rules: never retry 4xx except 429 (slowly); retry 5xx once, checking status before re-sending a deploy.',
    },
    servers: [{ url: SHIP }],
    components: {
      securitySchemes: { deployToken: { type: 'http', scheme: 'bearer', description: 'Deploy token. Request one with POST /api/public/deploy-tokens/request.' } },
      schemas: {
        Error: { type: 'object', required: ['error', 'code'], properties: { error: { type: 'string' }, code: { type: 'string' }, next: { type: 'string' }, links: { type: 'object', additionalProperties: { type: 'string' } } } },
        App: { type: 'object', properties: { name: { type: 'string' }, kind: { type: 'string', enum: ['service', 'static'] }, claimed: { type: 'boolean' }, expiresAt: { type: 'string', format: 'date-time', description: 'Deletion time while unclaimed.' } } },
        DeployReply: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            status: { $ref: '#/components/schemas/Status' },
            app: { $ref: '#/components/schemas/App' },
            next: { type: 'string', description: 'The one thing to do now.' },
            schedules: { $ref: '#/components/schemas/DeploySchedules' },
            warnings: {
              type: 'array',
              description: 'Problems that do not stop the deploy but should be fixed before telling the user it is done.',
              items: {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    enum: ['in_process_timer', 'schedules_unchanged', 'schedules_on_static_site', 'embarko_json_not_at_top', 'embarko_json_misnamed', 'embarko_json_unknown_keys'],
                    description: 'in_process_timer: the code uses a timer library whose jobs are not guaranteed to run on Embarko; list them under schedules in embarko.json. schedules_unchanged: the app has schedules and the upload declares none, so they were kept. schedules_on_static_site: a static site cannot run schedules; not applied. embarko_json_not_at_top: found in a subfolder; only the top folder is read. embarko_json_misnamed: a near-miss name (.embarko, embarko.yaml...); only embarko.json is read. embarko_json_unknown_keys: keys Embarko does not use were ignored.',
                  },
                  libraries: { type: 'array', items: { type: 'string' } },
                  expressions: { type: 'array', items: { type: 'object', properties: { cron: { type: 'string' }, file: { type: 'string' } } } },
                  detail: { type: 'string' },
                },
              },
            },
            links: { type: 'object', properties: { runSchedules: { type: 'string', description: 'POST here once the app is live to run every schedule once.' } }, additionalProperties: { type: 'string' } },
          },
        },
        StatusReply: {
          allOf: [{ $ref: '#/components/schemas/DeployReply' }],
          properties: { error: { type: 'string', description: 'Cause, when failed.' } },
        },
        Status: { type: 'string', enum: ['building', 'publishing', 'starting', 'live', 'failed', 'crashed', 'not_deployed', 'unknown'] },
        File: { type: 'object', required: ['path', 'content'], properties: { path: { type: 'string', description: 'Relative to the app root.' }, content: { type: 'string' }, encoding: { type: 'string', enum: ['utf8', 'base64'], default: 'utf8' } } },
        EnvVar: { type: 'object', required: ['key', 'value'], properties: { key: { type: 'string', pattern: '^[A-Za-z_][A-Za-z0-9_]*$' }, value: { type: 'string' } } },
        Accepted: { type: 'object', properties: { accepted: { type: 'boolean' }, deploymentId: { type: 'string' }, statusUrl: { type: 'string' }, terminal: { type: 'boolean' } } },
        Run: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            trigger: { type: 'string', enum: ['schedule', 'manual'] },
            outcome: { type: 'string', enum: ['running', 'ok', 'failed', 'skipped'] },
            terminal: { type: 'boolean', description: 'False only while running.' },
            httpStatus: { type: ['integer', 'null'] },
            error: { type: ['string', 'null'] },
            responseExcerpt: { type: ['string', 'null'], description: 'First 2KB of the app\'s reply.' },
            startedAt: { type: 'string', format: 'date-time' },
            finishedAt: { type: ['string', 'null'], format: 'date-time' },
            durationMs: { type: ['integer', 'null'] },
          },
        },
        Schedule: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: ['string', 'null'] },
            cron: { type: 'string', description: 'Five fields, stored expanded (@daily becomes 0 0 * * *).' },
            timezone: { type: 'string' },
            path: { type: 'string' },
            url: { type: 'string', description: 'The address that is called.' },
            enabled: { type: 'boolean' },
            nextRunAt: { type: ['string', 'null'], format: 'date-time', description: 'Null while paused.' },
            failing: { type: 'boolean' },
            consecutiveFailures: { type: 'integer' },
            alertWebhook: { type: 'object', properties: { set: { type: 'boolean' }, host: { type: ['string', 'null'] } }, description: 'The URL itself is never returned.' },
            lastRun: { oneOf: [{ $ref: '#/components/schemas/Run' }, { type: 'null' }] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            links: { type: 'object', properties: { runNow: { type: 'string', description: 'POST to run it once now.' }, runs: { type: 'string', description: 'GET for past runs.' } } },
          },
        },
        ScheduleInput: {
          type: 'object',
          properties: {
            cron: { type: 'string', maxLength: 100, description: 'minute hour day-of-month month day-of-week, or @hourly, @daily, @weekly, @monthly, @yearly. At most once every 5 minutes.' },
            path: { type: 'string', maxLength: 512, description: 'Path on the app, starting with /. Called with GET.' },
            timezone: { type: 'string', default: 'UTC', description: 'IANA name.' },
            name: { type: ['string', 'null'], maxLength: 100 },
            enabled: { type: 'boolean', default: true },
            alertWebhookUrl: { type: ['string', 'null'], format: 'uri', description: 'Public https:// URL that gets a JSON POST on schedule.failed and schedule.recovered.' },
          },
        },
        DeploySchedules: {
          type: 'object',
          description: 'What happens to the schedules listed in this upload\'s embarko.json.',
          properties: {
            declared: { type: 'integer', description: 'How many embarko.json lists.' },
            appliesWhen: { type: 'string', enum: ['live'], description: 'They take effect when this deploy goes live.' },
            applied: { type: 'boolean', description: 'false when they will not be applied, e.g. a temporary app.' },
            reason: { type: 'string', description: 'Why they will not be applied.' },
          },
        },
        FeedbackType: { type: 'string', enum: ['platform_bug', 'missing_capability', 'docs_issue', 'unexpected_behavior', 'other'] },
      },
    },
    paths: {
      '/apps': {
        post: {
          operationId: 'deployApp',
          summary: 'Deploy or redeploy an app',
          description: 'Without a token the app is temporary (deleted at app.expiresAt unless claimed). With a token it is owned, or claimed if it was temporary. An optional embarko.json in the app\'s top folder (in the .tar.gz, or as one of the JSON files) holds settings; today only schedules, the app\'s full set of timed calls (matched by path, [] removes all, file or key absent leaves them unchanged). Schema: https://embarko.ai/schema/embarko.json. Guide: https://embarko.ai/docs/embarko-json. Checked before the build; schedules apply only when the deploy succeeds, and not for a temporary app. Embarko creates a CRON_SECRET env var and sends it as Authorization: Bearer on each scheduled call. Never put secrets in embarko.json.',
          security: optionalToken,
          parameters: [
            { name: 'X-App-Name', in: 'header', schema: { type: 'string' }, description: 'Required for multipart. JSON bodies may use appName instead.' },
            agentHeader,
            { name: 'X-App-Version', in: 'header', schema: { type: 'string', pattern: '^[a-zA-Z0-9._-]+$' } },
            { name: 'X-App-Type', in: 'header', schema: { type: 'string', maxLength: 60 }, description: 'What the app is for, e.g. portfolio.' },
          ],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': { schema: { type: 'object', required: ['source'], properties: { source: { type: 'string', format: 'binary', description: '.tar.gz of the app, manifest at the archive root.' } } } },
              'application/json': { schema: { type: 'object', required: ['appName', 'files'], properties: { appName: { type: 'string' }, agentName: { type: 'string' }, appType: { type: 'string' }, version: { type: 'string' }, files: { type: 'array', maxItems: 2000, items: { $ref: '#/components/schemas/File' } } } } },
            },
          },
          responses: {
            200: ok('Static site already live', { $ref: '#/components/schemas/DeployReply' }),
            202: ok('Accepted: building or publishing. Poll links.status.', { $ref: '#/components/schemas/DeployReply' }),
            400: err('invalid_app_name, app_name_too_short, app_name_too_long, invalid_app_version, invalid_app_type, invalid_agent_name, missing_source_file, invalid_file_path, invalid_file_content, invalid_file_encoding, invalid_json, invalid_embarko_json, secrets_in_embarko_json, invalid_schedules, invalid_cron, schedule_too_frequent, invalid_timezone, invalid_path, duplicate_schedule_path, schedule_limit_reached'),
            401: err('unauthorized'),
            409: err('app_name_taken, app_name_reserved, rename_in_progress'),
            413: err('source_too_large, too_many_files'),
            422: err('no_manifest_at_root, app_nested_in_subdirectory, unsupported_storage_pattern, invalid_static_root, app_kind_changed'),
            429: common[429],
            500: err('deploy_failed, publish_failed: check status, then retry once'),
            502: err('app_name_check_failed: retry once'),
          },
        },
      },
      '/apps/{appName}/status': {
        get: { operationId: 'getStatus', summary: 'Where the app stands', description: 'No token while temporary; the owner\'s token once claimed.', security: optionalToken, parameters: [appName], responses: { 200: ok('Current status', { $ref: '#/components/schemas/StatusReply' }), 401: common[401], 404: err('not_found, or app_renamed (with newName and retryUrl)') } },
      },
      '/apps/{appName}/logs': {
        get: { operationId: 'getLogs', summary: 'Recent build or runtime output (about 8KB)', security: optionalToken, parameters: [appName, { name: 'stream', in: 'query', schema: { type: 'string', enum: ['stdout', 'stderr'], default: 'stdout' } }], responses: { 200: ok('Logs, or available: false for a static site', { type: 'object', properties: { available: { type: 'boolean' }, stream: { type: 'string' }, source: { type: 'string', enum: ['build'] }, logs: { type: 'string' }, reason: { type: 'string' } } }), 401: common[401], 404: common[404] } },
      },
      '/apps/{appName}/customer-query': {
        post: { operationId: 'sendFeedback', summary: 'Report a problem or request a feature about an app', security: optionalToken, parameters: [appName, { ...agentHeader, required: true }], requestBody: body({ type: 'object', required: ['type', 'message'], properties: { type: { $ref: '#/components/schemas/FeedbackType' }, message: { type: 'string', minLength: 1, maxLength: 5000 } } }), responses: { 201: ok('Received'), 400: err('Missing X-Agent-Name, or invalid_feedback_type'), 502: err('Transient: retry once') } },
      },
      '/api/public/customer-query': {
        post: { operationId: 'sendPublicFeedback', summary: 'Feedback not tied to an app', requestBody: body({ type: 'object', required: ['type', 'message', 'email'], properties: { type: { $ref: '#/components/schemas/FeedbackType' }, message: { type: 'string', minLength: 1, maxLength: 5000 }, email: { type: 'string', format: 'email' } } }), responses: { 201: ok('Received'), 400: err('Invalid body'), 429: err('10 per email and 20 per IP') } },
      },
      '/api/public/deploy-tokens/request': {
        post: { operationId: 'requestToken', summary: 'Email a deploy token to the person', description: 'Always 202, even when rate limited (5 per email, 10 per IP per hour). Call once; the token is never in the response.', requestBody: body({ type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } }), responses: { 202: ok('Sent if the address is valid', { type: 'object', properties: { message: { type: 'string' } } }) } },
      },
      '/api/public/showcase/apps/{appName}': {
        get: { operationId: 'getShowcaseListing', summary: 'An app\'s current Showcase listing', parameters: [appName], responses: { 200: ok('The listing'), 404: ok('Not listed yet') } },
      },
      '/api/apps/{appName}': {
        get: { operationId: 'getApp', summary: 'App details, including its project id', security: token, parameters: [appName], responses: { 200: ok('The app'), ...common } },
        patch: { operationId: 'setDisplayName', summary: 'Change the display name (not the address)', security: token, parameters: [appName], requestBody: body({ type: 'object', required: ['name'], properties: { name: { type: 'string' } } }), responses: { 200: ok('Updated'), ...common } },
        delete: { operationId: 'deleteApp', summary: 'Delete the app for good', description: 'Irreversible. Confirm with the person first.', security: token, parameters: [appName], requestBody: body({ type: 'object', required: ['confirmAppName'], properties: { confirmAppName: { type: 'string', description: 'Must equal appName.' } } }), responses: { 204: ok('Deleted'), 400: err('confirmation_required'), ...common } },
      },
      '/api/apps/{appName}/deployments': {
        get: { operationId: 'listDeployments', summary: 'Deploy history, newest first', security: token, parameters: [appName], responses: { 200: ok('Entries with id, status, version, source, agentName, triggeredBy, rollbackTarget'), ...common } },
      },
      '/api/apps/{appName}/deployments/{deploymentId}': {
        get: { operationId: 'getDeployment', summary: 'One deploy; poll a rollback with it', security: token, parameters: [appName, p('deploymentId')], responses: { 200: ok('The entry'), ...common } },
      },
      '/api/apps/{appName}/rollback': {
        post: { operationId: 'rollback', summary: 'Go back to an earlier successful deploy', security: token, parameters: [appName, agentHeader], requestBody: body({ type: 'object', properties: { deploymentId: { type: 'string', description: 'Omit for the previous good one.' } } }, false), responses: { 202: ok('Rolling back', { $ref: '#/components/schemas/Accepted' }), 422: err('no_rollback_target, rollback_image_unavailable: too old to restore (retainCount says how far back)'), ...common } },
      },
      '/api/apps/{appName}/slug-change': {
        post: { operationId: 'changeAddress', summary: 'Move the app to a new {name}.embarko.app', description: 'The old address stops working with no redirect. Confirm first. One change per app per week.', security: token, parameters: [appName], requestBody: body({ type: 'object', required: ['newName'], properties: { newName: { type: 'string' } } }), responses: { 200: ok('Done at once (never-deployed app); terminal: true'), 202: ok('Moving; poll /api/slug-changes/{projectId}'), 400: err('invalid_app_name, app_name_too_short, app_name_too_long'), 409: err('app_name_reserved, app_name_taken, deploy_in_progress, rename_in_progress, no_current_deployment'), 429: err('slug_change_cooldown (retryAfterMs)'), 500: err('rename_desynced: needs a person'), 502: err('rename_failed: app untouched, retry'), 503: err('app_state_unknown: retry') } },
      },
      '/api/slug-changes/{projectId}': {
        get: { operationId: 'getAddressChange', summary: 'Progress of an address change', security: token, parameters: [p('projectId')], responses: { 200: ok('state: in_progress, succeeded, failed or unknown; terminal; currentSlug'), ...common } },
      },
      '/api/apps/{appName}/env-vars': {
        get: { operationId: 'listEnvVars', summary: 'List keys (values are never returned)', security: token, parameters: [appName], responses: { 200: ok('Keys'), ...common } },
        put: { operationId: 'setEnvVars', summary: 'Set several (a merge)', security: token, parameters: [appName, agentHeader], requestBody: body({ type: 'object', required: ['vars'], properties: { vars: { type: 'array', items: { $ref: '#/components/schemas/EnvVar' } }, apply: { type: 'boolean', default: false } } }), responses: { 200: ok('Stored'), 202: ok('Stored and applying', { $ref: '#/components/schemas/Accepted' }), 409: err('not_supported_for_static'), 422: err('no_current_deployment: values saved; deploy the app'), ...common } },
      },
      '/api/apps/{appName}/env-vars/{key}': {
        put: { operationId: 'setEnvVar', summary: 'Set one', security: token, parameters: [appName, p('key'), agentHeader], requestBody: body({ type: 'object', required: ['value'], properties: { value: { type: 'string' }, apply: { type: 'boolean', default: false } } }), responses: { 200: ok('Stored'), 202: ok('Stored and applying'), 409: err('not_supported_for_static'), ...common } },
        delete: { operationId: 'deleteEnvVar', summary: 'Delete one', security: token, parameters: [appName, p('key')], responses: { 204: ok('Deleted'), 404: err('env_var_not_found'), 401: common[401] } },
      },
      '/api/apps/{appName}/env-vars/apply': {
        post: { operationId: 'applyEnvVars', summary: 'Make the running app see stored values', security: token, parameters: [appName, agentHeader], responses: { 202: ok('Applying', { $ref: '#/components/schemas/Accepted' }), 422: err('no_current_deployment'), ...common } },
      },
      '/api/apps/{appName}/schedules': {
        get: { operationId: 'listSchedules', summary: 'The app\'s schedules', security: token, parameters: [appName], responses: { 200: ok('Schedules and the per-app limit', { type: 'object', properties: { schedules: { type: 'array', items: { $ref: '#/components/schemas/Schedule' } }, limit: { type: 'integer' } } }), ...common } },
        post: { operationId: 'createSchedule', summary: 'Call a route of the app on a schedule', description: 'At each due time Embarko sends GET {path} to the app, with Authorization: Bearer {CRON_SECRET} when the app has that env var. 2xx is success; 5 minutes to answer. Run it once with runSchedule to check it works. Creates a CRON_SECRET env var if missing; it reaches the running app on its next deploy or env-var apply. Prefer listing schedules in the app\'s embarko.json: a deploy whose embarko.json has a schedules key replaces the app\'s full set.', security: token, parameters: [appName, agentHeader], requestBody: body({ allOf: [{ $ref: '#/components/schemas/ScheduleInput' }], required: ['cron', 'path'] }), responses: { 201: ok('Created', { $ref: '#/components/schemas/Schedule' }), 400: err('invalid_cron, schedule_too_frequent, invalid_timezone, invalid_path, invalid_alert_webhook, validation_failed'), 409: err('schedule_limit_reached, not_supported_for_static'), ...common } },
      },
      '/api/apps/{appName}/schedules/run': {
        post: { operationId: 'runAllSchedules', summary: 'Run every schedule once now', description: 'Use after a deploy goes live to check each one works. A schedule already running comes back with started: false and code run_in_progress. Poll each statusUrl until terminal is true.', security: token, parameters: [appName, agentHeader], responses: { 202: ok('Started', { type: 'object', properties: { runs: { type: 'array', items: { allOf: [{ $ref: '#/components/schemas/Run' }], properties: { scheduleId: { type: 'string' }, path: { type: 'string' }, statusUrl: { type: 'string', description: 'Path on ship.embarko.ai to poll.' }, started: { type: 'boolean', description: 'false when it was already running.' }, code: { type: 'string', description: 'run_in_progress when started is false.' } } } } } }), 404: err('no_schedules, or unknown app'), 409: err('not_supported_for_static'), 401: common[401] } },
      },
      '/api/apps/{appName}/schedules/{scheduleId}': {
        get: { operationId: 'getSchedule', summary: 'One schedule', security: token, parameters: [appName, p('scheduleId')], responses: { 200: ok('The schedule', { $ref: '#/components/schemas/Schedule' }), 404: err('schedule_not_found'), 401: common[401] } },
        patch: { operationId: 'updateSchedule', summary: 'Change, pause or resume a schedule (a merge)', description: 'Send only the fields to change. enabled: false pauses it. name and alertWebhookUrl take null to clear.', security: token, parameters: [appName, p('scheduleId'), agentHeader], requestBody: body({ $ref: '#/components/schemas/ScheduleInput' }), responses: { 200: ok('Updated', { $ref: '#/components/schemas/Schedule' }), 400: err('invalid_cron, schedule_too_frequent, invalid_timezone, invalid_path, invalid_alert_webhook, validation_failed'), 404: err('schedule_not_found'), 409: err('not_supported_for_static'), 401: common[401] } },
        delete: { operationId: 'deleteSchedule', summary: 'Delete a schedule and its runs', security: token, parameters: [appName, p('scheduleId')], responses: { 204: ok('Deleted'), 404: err('schedule_not_found'), 401: common[401] } },
      },
      '/api/apps/{appName}/schedules/{scheduleId}/run': {
        post: { operationId: 'runSchedule', summary: 'Run a schedule once now', description: 'Works on a paused schedule too. Poll statusUrl until terminal is true.', security: token, parameters: [appName, p('scheduleId'), agentHeader], responses: { 202: ok('Started', { allOf: [{ $ref: '#/components/schemas/Run' }], properties: { statusUrl: { type: 'string', description: 'Path on ship.embarko.ai to poll.' } } }), 404: err('schedule_not_found'), 409: err('run_in_progress, not_supported_for_static'), 401: common[401] } },
      },
      '/api/apps/{appName}/schedules/{scheduleId}/runs': {
        get: { operationId: 'listScheduleRuns', summary: 'Past runs, newest first, a page at a time (the last 100 are kept)', security: token, parameters: [appName, p('scheduleId'), { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }, { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } }, { name: 'outcome', in: 'query', schema: { type: 'string', enum: ['ok', 'failed', 'skipped', 'running'] } }, { name: 'trigger', in: 'query', schema: { type: 'string', enum: ['schedule', 'manual'] } }], responses: { 200: ok('Runs', { type: 'object', properties: { runs: { type: 'array', items: { $ref: '#/components/schemas/Run' } }, page: { type: 'integer' }, pageSize: { type: 'integer' }, total: { type: 'integer', description: 'Runs matching the filters' }, totalPages: { type: 'integer' }, kept: { type: 'integer', description: 'Runs kept per schedule' } } }), 404: err('schedule_not_found'), 401: common[401] } },
      },
      '/api/apps/{appName}/schedules/{scheduleId}/runs/{runId}': {
        get: { operationId: 'getScheduleRun', summary: 'One run; poll a run-now with it', security: token, parameters: [appName, p('scheduleId'), p('runId')], responses: { 200: ok('The run', { $ref: '#/components/schemas/Run' }), 404: err('run_not_found'), 401: common[401] } },
      },
      '/api/apps/{appName}/domains': {
        get: { operationId: 'listDomains', summary: 'Custom domains (status pending_dns, active or failed)', security: token, parameters: [appName], responses: { 200: ok('Domains'), ...common } },
        post: { operationId: 'registerDomain', summary: 'Register a domain; returns the DNS record to add', security: token, parameters: [appName], requestBody: body({ type: 'object', required: ['domain'], properties: { domain: { type: 'string' } } }), responses: { 201: ok('Registered; instructions holds the DNS record'), 400: err('invalid_domain, domain_reserved'), 409: err('domain_taken'), ...common } },
      },
      '/api/apps/{appName}/domains/{domain}/verify': {
        post: { operationId: 'verifyDomain', summary: 'Check DNS and activate; safe to repeat', security: token, parameters: [appName, p('domain')], responses: { 200: ok('Active'), 422: err('DNS not pointing here yet: retry later'), ...common } },
      },
      '/api/apps/{appName}/domains/{domain}': {
        delete: { operationId: 'removeDomain', summary: 'Remove a domain', security: token, parameters: [appName, p('domain')], responses: { 204: ok('Removed'), 404: err('domain_not_found'), 401: common[401] } },
      },
      '/api/apps/{appName}/analytics': {
        get: { operationId: 'getAnalytics', summary: 'Traffic, errors and resource use', security: token, parameters: [appName, { name: 'range', in: 'query', schema: { type: 'string', enum: ['24h', '7d', '30d', '90d', 'all'], default: '24h' } }], responses: { 200: ok('Analytics'), 503: err('Analytics unavailable; not zero traffic'), ...common } },
      },
      '/api/apps/{appName}/showcase': {
        put: { operationId: 'putShowcaseListing', summary: 'Create or update the app\'s Showcase listing (a merge)', description: 'App must be claimed. Get the person\'s go-ahead first; a public listing is live at once.', security: token, parameters: [appName], requestBody: body({ type: 'object', properties: { collectionSlug: { type: 'string' }, code: { type: 'string' }, name: { type: 'string' }, tagline: { type: 'string' }, creatorName: { type: 'string' }, description: { type: 'string', maxLength: 4000 }, story: { type: 'string', maxLength: 600 }, creatorProfile: { type: 'string', format: 'uri' }, contributorEmails: { type: 'array', maxItems: 10, items: { type: 'string', format: 'email' } }, builtWith: { type: 'string' }, category: { type: 'string', enum: ['AI Tool', 'Personal', 'Business', 'Productivity', 'Education', 'Game', 'Developer Tool', 'Other'] }, tags: { type: 'array', maxItems: 8, items: { type: 'string' } }, screenshotUrls: { type: 'array', maxItems: 10, items: { type: 'string', format: 'uri' } }, videoUrl: { type: 'string', format: 'uri' }, customHtml: { type: 'string', maxLength: 50000 }, prd: { type: 'string' } } }), responses: { 200: ok('Updated; status approved, pending or rejected'), 201: ok('Listed; status approved or pending'), 403: err('SHOWCASE_COLLECTION_PRIVATE'), 404: err('SHOWCASE_COLLECTION_UNKNOWN'), 401: common[401] } },
      },
    },
  };
}

// schema.org JSON-LD for the HTML pages, in place of a separate feed.
function jsonLd(base) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Embarko',
    url: SITE,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    description: 'Hosting for apps built by AI agents.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    sameAs: [`${base}/llms.txt`, `${base}/.well-known/agent.json`, `${base}/openapi.json`],
  };
}

export { agentJson, agentCard, apiCatalog, llmsTxt, openapi, jsonLd };
