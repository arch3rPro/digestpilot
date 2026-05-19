# Automation Recipes

Keep automation platform-neutral. The core skill reads files and writes Markdown or JSON; schedulers and notification channels are wrappers.

## Local Cron

Run a daily digest at 09:00:

```cron
0 9 * * * cd /path/to/workspace && python3 skills/rss-ai-digest/scripts/rss_monitor.py digest --registry feeds.json --state seen.json --since 24h --min-score 7 --format markdown > digest.md
```

Run keyword monitoring every hour:

```cron
0 * * * * cd /path/to/workspace && python3 skills/rss-ai-digest/scripts/rss_monitor.py check-new --registry feeds.json --state seen.json --keywords "agents,llm,evals" --format json > latest.json
```

## GitHub Actions

Use when the feed registry lives in a repository and the user wants a scheduled artifact.

```yaml
name: RSS AI Digest
on:
  schedule:
    - cron: "0 1 * * *"
  workflow_dispatch:

jobs:
  digest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.x"
      - run: python3 skills/rss-ai-digest/scripts/rss_monitor.py digest --registry feeds.json --state seen.json --since 24h --min-score 7 --format markdown > digest.md
      - uses: actions/upload-artifact@v4
        with:
          name: rss-ai-digest
          path: digest.md
```

## Agent Runtime Wrappers

Codex, Claude, OpenClaw, n8n, Feishu, Slack, and email should call the same CLI and consume JSON or Markdown output. Keep wrappers outside the core script unless the user asks for a specific integration.

Notification adapters should receive already-filtered results. Do not put channel-specific policy into feed parsing, scoring, or state management.
