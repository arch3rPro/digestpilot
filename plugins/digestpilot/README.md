# DigestPilot Plugin

DigestPilot turns trusted information streams into daily briefs and research-ready evidence for AI agents.

## Included Skills

- `rss-ai-digest`: RSS/Atom digest, monitoring, filtering, scoring, and dedupe.
- `public-trend-radar`: public-channel trend cards from HN, GitHub releases, and URL lists.
- `rss-source-curator`: source quality governance and reviewable registry maintenance.
- `subscription-research-agent`: local-first evidence briefs and research report workflows.

## Runtime

The deterministic runtime remains the `subscription-research` CLI from `packages/research-cli`.

During local development, run CLI commands from the repository checkout:

```bash
node packages/research-cli/dist/src/cli.js --help
```

After npm publication, prefer:

```bash
npx @subscription-research/cli --help
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
