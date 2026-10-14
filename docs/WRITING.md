# Writing the docs

How to write every page of the agent guide (`app/lib/guide/content.js`, served
at `/docs`) and every page in `content/docs/`. AI agents and people read the
same page, so it has to work for both: short, plain, easy to scan.

Check a page against this guide whenever you add or edit it.

## The rules

| # | Rule | In practice |
|---|---|---|
| 1 | Lead with the answer | First line says what it is. If there are options, a table comes next. |
| 2 | Ask the reader's question | Headings like *When is it needed* and *How to do it*, not *Overview* or *Details*. |
| 3 | One action per step | Numbered steps, one short sentence each. Code only when the step needs it. |
| 4 | One home per topic | Explain a topic on one page. Other pages give one line and a link. |
| 5 | Say what, not why we built it | Leave out design choices and history. Only explain why when the reader needs it to act. |
| 6 | Keep the hard facts | Limits, error codes, and "do not retry" rules go in a short **Good to know** list. |
| 7 | Plain words | Short sentences. No long dashes, no side notes, no "deliberately" or "note that". |

## Page shape

```markdown
# Topic

One sentence: what it is and who it is for.

| Option | Best for | Result |
|---|---|---|

## [When you need it](#when)

One or two sentences.

## [How to do it](#how)

1. First option or step.
2. Next.

## [Good to know](#good-to-know)

- **Short fact.** What to do about it.
```

Leave out any section the topic doesn't need.

## Headings and links

- Write headings as self-links: `## [How to do it](#how)`. Other pages, the
  skills and `llms.txt` link to these anchors.
- **Don't change an existing anchor.** You can reword the heading text, but
  keep the `#id` the same.
- To link to another doc, use its file name: `[Connectors](connectors.md)` or
  `capabilities.md#agent-auth`. The site turns that into the right link.

## What agents must still get

Short doesn't mean missing facts. Every action an agent can take must still
say:

- the exact command or request, ready to copy
- what success looks like
- what failure looks like, and whether to retry
- when to stop and ask the person

If cutting a line would make an agent guess, loop, or get stuck, keep the line.

## Example

Before:

> **Why:** It is deliberately minimal — an agent can always get access without
> a browser, so it is never blocked on a signup flow, and the very first
> deploy needs no credential at all.

After:

> The first deploy needs no sign-in.

## Before you ship

- [ ] The first line says what the page is for.
- [ ] Every heading is a question the reader would ask.
- [ ] Steps are numbered, one action each.
- [ ] Nothing repeats another page. Links are used instead.
- [ ] Limits, errors and retry rules are still there.
- [ ] Existing anchors are unchanged.
- [ ] Facts about where apps run follow `app/lib/trust.ts`.
