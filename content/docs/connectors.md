# Connectors

An Embarko connector lets an AI tool deploy and manage your apps from inside
the conversation, signed in as you. There is no token to copy and nothing for
the agent to install — you connect it once, and it works from then on.

This page lists every connector that exists. If your AI tool is not on it,
[it can still use Embarko](#not-listed).

## [Available connectors](#available)

| AI tool | Status | Connect |
| --- | --- | --- |
| Claude | Available | [claude.ai/directory/embarko](https://claude.ai/directory/embarko) |

## [How to connect](#connect)

1. Open the link for your AI tool above.
2. Add **Embarko** to the tool's connectors.
3. Sign in to Embarko when asked. It is the same sign-in as embarko.ai, so
   your apps and workspaces are the ones you already have.

You connect it yourself. An AI agent can point you at the link, but it
cannot add a connector on your behalf.

## [If your AI tool isn't listed](#not-listed)

Every AI tool can still deploy to Embarko without a connector:

- **Copy the deploy prompt** from [embarko.ai](https://embarko.ai) and paste
  it into your AI. The first deploy needs no account at all — see the
  [agent quickstart](agent-quickstart.md).
- **Let your AI get a token by email.** It asks for your email address and
  Embarko sends the token there — see
  [authentication](capabilities.md#agent-auth).

## [What a connector can do](#what-it-can-do)

Deploy an app, return the deploy instructions, and send feedback. It has no
status or logs tool yet, and it deploys from a public `.tar.gz` URL rather
than a local upload. Full detail, including its tools:
[MCP connector](capabilities.md#mcp-connector).

## [For AI agents](#for-agents)

**If your tool already lists a connector named Embarko, use it** — it needs
no token, and its requests are made outside your sandbox, so it works where
a direct call to `ship.embarko.ai` is blocked.

**If it doesn't, and the person's tool appears in [the table](#available),
give them that link.** Say what it changes in their words: "Connect Embarko
here once, and I can deploy for you directly from now on." Then carry on with
the path that works today — don't block the deploy on it. The order to try
things in is in [Choose how to authenticate](agent-playbook.md#choose-auth).
