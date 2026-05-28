# DigestPilot Plugin

DigestPilot turns trusted information streams into daily briefs and research-ready evidence for AI agents.

## Included Skills

- `rss-ai-digest`: RSS/Atom digest, monitoring, filtering, scoring, and dedupe.
- `public-trend-radar`: public-channel trend cards from HN, GitHub releases, and URL lists.
- `rss-source-curator`: source quality governance and reviewable registry maintenance.
- `subscription-research-agent`: local-first evidence briefs and research report workflows.

## Runtime

Plugin installation provides Skills only. The deterministic runtime remains the Node CLI from `packages/research-cli` and must be installed, linked, or invoked from a repository checkout.

The current development command is `subscription-research`, but the command name is not a permanent product contract. Resolve the runtime command in this order:

1. Use `DIGESTPILOT_RUNTIME_CMD` when it is set.
2. Use `subscription-research` when it is available on `PATH`.
3. From a repository checkout, use:

```bash
node packages/research-cli/dist/src/cli.js --help
```

For local development:

```bash
cd packages/research-cli
npm install
npm run build
npm link
cd ../..
node scripts/doctor.mjs
```

## Claude Code

Test locally:

```bash
claude --plugin-dir ./plugins/digestpilot
```

Plugin skills are namespaced, for example `/digestpilot:rss-ai-digest`.

Marketplace development:

```text
/plugin marketplace add .
/plugin install digestpilot@digestpilot
```

## Codex

The Codex manifest lives at `.codex-plugin/plugin.json`. Use the repository marketplace at `.agents/plugins/marketplace.json` during local plugin development.
