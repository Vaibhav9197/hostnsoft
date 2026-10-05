# Connectors

An Embarko connector lets an AI tool deploy and manage your apps from inside
the chat, signed in as you. No token to copy, nothing for the agent to
install. Connect once and it keeps working.

This page lists every connector that exists. If your AI tool is missing,
[it can still use Embarko](#not-listed).

## [Which connectors are available?](#available)

| AI tool | Status | Connect |
| --- | --- | --- |
| Claude | Available | [claude.ai/directory/embarko](https://claude.ai/directory/embarko) |

## [How do I connect?](#connect)

1. Open the link for your AI tool above.
2. Add **Embarko** to the tool's connectors.
3. Sign in to Embarko when asked. It is the same sign-in as embarko.ai, so
   you see the apps and workspaces you already have.

You must connect it yourself. An AI agent can give you the link, but it
cannot add a connector for you.

## [What if my AI tool isn't listed?](#not-listed)

Every AI tool can still deploy to Embarko without a connector:

| Option | How |
|---|---|
| Deploy prompt | Copy it from [embarko.ai](https://embarko.ai) and paste it into your AI. The first deploy needs no account. See the [agent quickstart](agent-quickstart.md) |
| Token by email | Your AI asks for your email and Embarko sends the token there. See [authentication](capabilities.md#agent-auth) |

## [What can a connector do?](#what-it-can-do)

Deploy an app, return the deploy instructions, and send feedback. It has no
status or logs tool yet. It deploys from a public `.tar.gz` URL, not a local
upload. Full detail and its tools:
[MCP connector](capabilities.md#mcp-connector).

## [What should an AI agent do?](#for-agents)

1. **If your tool already lists a connector named Embarko, use it.** It
   needs no token. Its requests run outside your sandbox, so it works where
   a direct call to `ship.embarko.ai` is blocked.
2. **If not, and the person's tool is in [the table](#available), give them
   that link.** Say it in their words: "Connect Embarko here once, and I can
   deploy for you directly from now on."
3. **Carry on with the path that works today.** Don't block the deploy on
   the connector.

The order to try things in is in
[Choose how to authenticate](agent-playbook.md#choose-auth).
