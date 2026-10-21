/**
 * Turns content.js into the shapes the guide is served in: Markdown (what an
 * agent gets by default) and JSON (for code that parses it). The HTML pages
 * under app/docs render this same Markdown, so all three say the same thing.
 */

import { SITE, VERSION, SECTIONS, ROUTES, TALK_RULE, DOMAINS, RESERVED_EXAMPLES, topics } from './content';

const sectionOf = (id) => SECTIONS.find((s) => s.id === id);

// ------------------------------------------------------------------ JSON

function index(base) {
  const all = topics(base);
  return {
    name: 'Embarko agent guide',
    version: VERSION,
    about: 'Embarko hosts apps that an AI agent built, at <app-name>.embarko.app. The person you are helping is usually not a developer.',
    start_here: `${base}/docs/quickstart`,
    read_first: `${base}/docs/prerequisites`,
    talk_to_user: TALK_RULE,
    routes: ROUTES.map(({ order, route, use_when }) => ({ order, route, use_when })),
    how_to_read: 'This is the contents page. Open the one topic you need. Every topic repeats the essentials of "Before you start", so you can land on any of them directly.',
    sections: SECTIONS.map((s) => ({
      n: s.n,
      name: s.name,
      about: s.blurb,
      topics: all
        .filter((tp) => tp.section === s.id)
        .map((tp) => ({ topic: tp.topic, title: tp.title, covers: tp.covers, url: `${base}/docs/${tp.topic}` })),
    })),
    formats: {
      markdown: 'The default. Topic pages start with YAML frontmatter holding the machine fields.',
      json: 'Append .json to any guide URL, or send Accept: application/json.',
      html: 'Open in a browser.',
    },
    domains: DOMAINS,
    links: {
      llms: `${base}/llms.txt`,
      agent_manifest: `${base}/.well-known/agent.json`,
      openapi: `${base}/openapi.json`,
      pricing: `${SITE}/pricing`,
    },
  };
}

function topicJson(base, tp) {
  const s = sectionOf(tp.section);
  return {
    ...tp,
    section: { n: s.n, name: s.name },
    url: `${base}/docs/${tp.topic}`,
    contents: `${base}/docs`,
    version: VERSION,
  };
}

// -------------------------------------------------------------- MARKDOWN

const bullet = (items) => items.map((x) => `- ${x}`).join('\n');
const numbered = (items) => items.map((x, i) => `${i + 1}. ${x}`).join('\n');
const code = (s) => '`' + s + '`';

// "On this page: a, b, c" under the title, from the page's own section
// headings, so a reader can tell at a glance whether the page has what it
// needs. Built from the output, so it can't list a section that isn't there.
function withContents(out) {
  const i = out.findIndex((l) => /^# /.test(l));
  const items = [];
  for (const l of out.slice(i + 1)) {
    const m = l.match(/^## (?:\d+\. )?(.*)/) || l.match(/^\*\*([^*]+)\*\*(?: \(.*\))?$/);
    if (!m) continue;
    const name = m[1].startsWith('Example: ') ? 'Examples' : m[1];
    if (!items.includes(name)) items.push(name);
  }
  if (items.length > 1) out.splice(i + 2, 0, `**On this page:** ${items.join(', ')}`, '');
  return out;
}

// A book's contents page: section and topic titles, numbered and linked,
// nothing else. What each topic covers lives on the topic and in the JSON.
function indexMd(base) {
  const ix = index(base);
  const out = ['# Embarko agent guide', ''];
  for (const s of ix.sections) {
    // A section with one page is that page: link the section, no sub-entry.
    if (s.topics.length === 1) { out.push(`## ${s.n}. [${s.name}](${s.topics[0].url})`, ''); continue; }
    out.push(`## ${s.n}. ${s.name}`, '');
    out.push(bullet(s.topics.map((t, i) => `${s.n}.${i + 1} [${t.title}](${t.url})`)), '');
  }
  out.push('## Reference', '', bullet([
    `[Reserved app names](${base}/docs/reserved-names)`,
    `[OpenAPI](${ix.links.openapi})`,
    `[Pricing](${ix.links.pricing})`,
  ]), '');
  return out.join('\n');
}

function topicMd(base, tp, { standalone = true } = {}) {
  const s = sectionOf(tp.section);
  const out = [];
  // Machine fields up front: who does it (connector action, HTTP call),
  // whether the person is needed, and what must happen first. The rest
  // of the topic's fields are in its .json.
  if (standalone) {
    const w = tp.who || {};
    const fm = [
      ['topic', tp.topic],
      ['connector', w.connector],
      ['api', w.api],
      ['needs_human', w.needs_human],
      ['not_available', tp.available === false ? 'true' : null],
      ['requires', tp.prerequisites && tp.prerequisites.requires && tp.prerequisites.requires.length ? `[${tp.prerequisites.requires.map((r) => r.topic).join(', ')}]` : null],
    ].filter(([, v]) => v);
    const yaml = (v) => (/^\[[\w, -]*\]$/.test(v) || (/^[\w.:/<> -]+$/.test(v) && !v.includes(': ')) ? v : JSON.stringify(v));
    out.push('---', ...fm.map(([k, v]) => `${k}: ${yaml(v)}`), '---', '');
  }
  if (standalone) out.push(`[← Guide home](${base}/docs)`, '');
  out.push(`${standalone ? '#' : '##'} ${tp.title}`, '');
  if (tp.flow) return flowMd(base, tp, out, standalone);

  // One line, not the whole rulebook: the rules live on prerequisites.
  const p = tp.prerequisites;
  if (p && p.read_first && standalone) {
    const needs = p.requires.length ? ` Needs first: ${p.requires.map((r) => `[${r.topic}](${r.url})${r.only ? ` (${r.only})` : ''}`).join(', ')}.` : '';
    out.push(`> Plain words unless the person is a developer. Never invent a link, name or code. [Rules](${p.read_first})${needs}`, '');
  }

  out.push(tp.summary, '');
  // The connector route stays in the body too: agents act on body text, not on the frontmatter.
  if (tp.who && tp.who.connector) out.push(`**Connector:** ${tp.who.connector}`, '');
  if (tp.done_when) out.push(`**Done when:** ${tp.done_when}`, '');

  if (tp.about) {
    out.push('**What Embarko is**', '', bullet([tp.about.what, `Languages: ${tp.about.languages.join(', ')}.`, `Address: ${tp.about.address}.`, `First deploy: ${tp.about.first_deploy}`]), '');
  }
  if (tp.domains) {
    out.push('**Hosts you may need to reach** (all Embarko; allowlist them together)', '', bullet(tp.domains.map((d) => `${code(d.host)}: ${d.why}`)), '');
  }
  if (tp.talking_to_the_user) {
    const tk = tp.talking_to_the_user;
    out.push('**Talking to the person**', '', tk.rule, '', tk.technical_users, '');
    out.push(`Say: ${tk.say.join(' · ')}`, '', `Avoid: ${tk.avoid.join(' · ')}`, '');
    out.push('Never ask:', '', bullet(tk.never_ask), '', 'Ask only for:', '', bullet(tk.ask_only_when), '', tk.ask_how, '');
    out.push('Always tell them:', '', bullet(tk.always_tell), '', `**Stop when it works.** ${tk.stop_when_done}`, '');
    out.push('Examples:', '', bullet(Object.entries(tk.examples).map(([k, v]) => `${k}: "${v}"`)), '');
  }
  if (tp.routes) {
    out.push('**Which route**', '', numbered(tp.routes.map((r) => `**${r.route}**: ${r.use_when} ${r.why}${r.then ? ' ' + r.then : ''}${r.say ? ` Say: "${r.say}"` : ''}${r.which_link ? ' ' + r.which_link : ''}`)), '');
  }
  if (tp.fit_check) {
    const f = tp.fit_check;
    out.push('**Does the app fit?**', '', f.fits, '', bullet(f.does_not_fit.map((x) => `${x.feature}: not supported. Instead: ${x.instead}`)), '', f.rule, '');
  }
  if (tp.source_formats) {
    const label = { connector: 'Connector', http_multipart: 'HTTP multipart', http_json: 'HTTP JSON', upload_page: 'Upload page' };
    out.push('**What each route accepts**', '', bullet(Object.entries(tp.source_formats).map(([k, v]) => `${label[k] || k}: ${v}`)), '');
  }
  if (tp.retry) {
    out.push('**Errors and retries (every call)**', '', bullet(tp.retry.rules.map((x) => `${x.status}: retry ${x.retry}. ${x.do}`)), '', `Backoff: ${tp.retry.backoff}`, '');
  }
  if (tp.requirements) out.push('**Requirements**', '', bullet(tp.requirements), '');
  if (tp.how_it_starts) out.push('**How it starts**', '', bullet(tp.how_it_starts), '');
  if (tp.name_rules) {
    const n = tp.name_rules;
    out.push('**App name**', '', bullet([`Pattern: ${code(n.pattern)}`, `Length: ${n.length}`, `Unique: ${n.unique}`, `Reserved: ${n.reserved}`]), '');
  }
  if (tp.available_for) out.push('**Available for**', '', '| AI tool | Add it |', '| --- | --- |', ...tp.available_for.map((x) => `| ${x.tool} | ${x.link} |`), '');
  if (tp.tools) out.push('**Its tools**', '', bullet(Object.entries(tp.tools).map(([k, v]) => `${code(k)}: ${v}`)), '');
  if (tp.statuses) out.push('**Statuses**', '', bullet(Object.entries(tp.statuses).map(([k, v]) => `${code(k)}: ${v}`)), '');
  if (tp.types) out.push('**Types**', '', bullet(Object.entries(tp.types).map(([k, v]) => `${code(k)}: ${v}`)), '');
  if (tp.steps) {
    const label = { connector: 'With the connector', http_api: 'Over HTTP', dashboard: 'In the dashboard', any: 'Steps', manage: 'Change, pause or delete' };
    for (const [k, v] of Object.entries(tp.steps)) out.push(`**${label[k] || k}**`, '', numbered(v), '');
  }
  if (tp.secrets_page) out.push('**Where the person adds a secret**', '', bullet(Object.values(tp.secrets_page)), '');
  if (tp.examples) {
    for (const ex of tp.examples) {
      out.push(`**Example: ${ex.title}**`, '');
      if (ex.body) out.push('body.json:', '', '```json', JSON.stringify(ex.body), '```', '');
      if (ex.command) out.push('```bash', ex.command, '```', '');
      // App code to copy, as opposed to a command to run.
      if (ex.code) out.push('```' + (ex.lang || ''), ex.code, '```', '');
      if (ex.note) out.push(ex.note, '');
      // The all-in-one file names the reply but leaves its body to the topic
      // page, which keeps it small enough for fetch tools.
      if (ex.response && standalone) out.push(`Reply ${ex.response_status}:`, '', '```json', JSON.stringify(ex.response), '```', '');
      else if (ex.response) out.push(`Reply ${ex.response_status}: shown on the topic page`, '');
    }
  }
  if (tp.polling && tp.topic !== 'status') out.push(`**Polling:** GET ${tp.polling.url} every ${tp.polling.every_seconds.server_app}s (${tp.polling.every_seconds.static_site}s for a static site) until it is final. Statuses and limits: [status](${base}/docs/status).`, '');
  else if (tp.polling) {
    const p = tp.polling;
    out.push('**Polling**', '', bullet([
      `GET ${p.url}`,
      `Every ${p.every_seconds.server_app} seconds for a server app, every ${p.every_seconds.static_site} seconds for a static site.`,
      `Keep waiting on: ${p.keep_waiting_on.map(code).join(', ')}.`,
      `Final: ${Object.entries(p.final).map(([k, v]) => `${code(k)} (${v})`).join('; ')}`,
      `${code('unknown')}: ${p.unknown}`,
      `Give up after ${p.give_up_after_minutes} minutes: ${p.on_give_up} ${p.note}`,
      p.auth,
    ]), '');
  }
  if (tp.large_apps) out.push('**Large apps**', '', tp.large_apps.problem, '', bullet(tp.large_apps.what_to_do), '');
  if (tp.fields) out.push('**Fields**', '', bullet(Object.entries(tp.fields).map(([k, v]) => `${code(k)}: ${v}`)), '');
  if (tp.receives) out.push('**What the app receives**', '', bullet(tp.receives), '');
  if (tp.run_outcomes) out.push('**Run outcomes**', '', bullet(Object.entries(tp.run_outcomes).map(([k, v]) => `${code(k)}: ${v}`)), '');
  if (tp.alerts) out.push('**Failure alerts**', '', bullet(tp.alerts), '');
  if (tp.limits) out.push('**Limits**', '', bullet(tp.limits), '');
  if (tp.errors_pointer) out.push(tp.errors_pointer.replace('see errors', `see [errors](${base}/docs/errors)`), '');
  if (tp.errors) {
    const cell = (x) => String(x == null ? '' : x).replace(/\|/g, '\\|');
    out.push('**Errors**', '', '| Code | Status | Retry | What to do |', '| --- | --- | --- | --- |',
      ...tp.errors.map((e) => `| ${code(cell(e.code))} | ${cell(e.status)} | ${cell(e.retry)} | ${cell(e.do)} |`), '');
  }
  if (tp.more_errors) out.push(tp.more_errors.replace('see errors', `see [errors](${base}/docs/errors)`), '');
  if (tp.say_to_user) out.push('**What to tell the person**', '', bullet(Object.entries(tp.say_to_user).map(([k, v]) => `${k}: "${v}"`)), '');
  out.push(`**Next:** ${tp.next}`, '');
  if (standalone && tp.related && tp.related.length) out.push(`**Related:** ${tp.related.map((r) => `[${r.topic}](${r.url})`).join(' · ')}`, '');
  if (standalone) out.push('---', '', `[Guide home](${base}/docs) · JSON: add .json`);
  return (standalone ? withContents(out) : out).join('\n');
}

// The quickstart: five steps, each the action and a link out for when it
// goes wrong. Kept short on purpose.
function flowMd(base, tp, out, standalone) {
  const sh = (cmd, body) => [...(body ? ['body.json:', '', '```json', JSON.stringify(body), '```', ''] : []), '```bash', cmd, '```', ''];
  const more = (refs) => (refs ? [`More: ${refs.map((r) => `[${r.topic}](${r.url}) (${r.why.toLowerCase()})`).join(' · ')}`, ''] : []);
  out.push(tp.summary, '', `> ${tp.talk}`, '');
  if (tp.resume) out.push(tp.resume.replace('see resume', `[resume](${base}/docs/resume)`), '');
  for (const st of tp.flow) {
    out.push(`## ${st.step}. ${st.name}`, '');
    if (st.skip_if) out.push(`**Skip if** ${st.skip_if.charAt(0).toLowerCase()}${st.skip_if.slice(1)} ${st.why}`, '');
    if (st.connector) out.push(st.connector, '', 'Otherwise:', '');
    if (st.intro) out.push(st.intro, '');
    if (st.routes) out.push('| If | Then |', '| --- | --- |', ...st.routes.map(([cond, then]) => `| ${cond} | ${then} |`), '');
    if (st.do) out.push(numbered(st.do), '');
    if (st.command) out.push(...sh(st.command, st.body));
    if (st.poll) out.push('Poll:', '', ...sh(st.poll));
    if (st.then) out.push(st.then, '');
    if (st.done_when) out.push(`**Done when:** ${st.done_when}`, '');
    if (st.if_it_fails) out.push(`**If it fails:** ${st.if_it_fails}`, '');
    if (st.blocked) out.push(`**Blocked:** ${st.blocked}`, '');
    if (st.outcomes) {
      out.push('| They say | Read | Done when |', '| --- | --- | --- |',
        ...st.outcomes.map(([say, topic, done, note]) => `| ${say} | [${topic}](${base}/docs/${topic})${note ? ` (${note})` : ''} | ${done} |`), '');
    }
    if (st.types) out.push(`Types: ${st.types}`, '');
    out.push(...more(st.read_more));
  }
  if (standalone) out.push('---', '', `[Guide home](${base}/docs) · [Rules](${base}/docs/prerequisites)`);
  return (standalone ? withContents(out) : out).join('\n');
}

// llms-full.txt is a pointer, not the whole guide. Agents that fetched the
// whole guide paid about 14k tokens and their fetch tools summarised it
// anyway; one topic at a time is cheaper and keeps the exact wording.
function fullPointer(base) {
  return [
    '# Embarko agent guide',
    '',
    'This guide is served one topic at a time, so you read only what the task needs.',
    '',
    `- Start here: ${base}/docs/quickstart`,
    `- Contents: ${base}/docs`,
    `- Errors and retry rules: ${base}/docs/errors`,
    '',
    'Every page is Markdown; add .json to any guide URL for JSON.',
  ].join('\n');
}

function reservedNamesMd(base) {
  return [
    `[← Guide home](${base}/docs)`,
    '',
    '# Reserved app names',
    '',
    'Some names are reserved for Embarko itself and can never be used. A reserved name returns 409 app_name_reserved: pick a different name; adding a word usually works (docs → my-docs).',
    '',
    `Examples: ${RESERVED_EXAMPLES.join(', ')}.`,
  ].join('\n');
}

export { index, topicJson, indexMd, topicMd, fullPointer, reservedNamesMd };
