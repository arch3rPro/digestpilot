# RSS Agent Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[中文说明](./README.zh-CN.md) | [Examples](./examples/README.md) | [Changelog](./CHANGELOG.md) | [v0.3.0](./docs/releases/v0.3.0.md)

Portable RSS-related Skills and local-first subscription research workflows for agent ecosystems.

`rss-agent-skills` helps agents import RSS/Atom/OPML subscriptions, find high-signal AI and technical content, maintain feed quality, and prepare source-backed evidence briefs. The core is platform-neutral: Codex, Claude, Cursor, schedulers, and future plugin wrappers should call the same Skills and CLI contract instead of forking the workflow.

## What Is Included

| Package | Role |
| --- | --- |
| [`rss-ai-digest`](./skills/rss-ai-digest/SKILL.md) | RSS/Atom/OPML import, filtering, scoring, dedupe, digest rendering, and direct RSS commands. |
| [`rss-source-curator`](./skills/rss-source-curator/SKILL.md) | Feed health review, source quality evaluation, and reviewable registry maintenance. |
| [`subscription-research-agent`](./skills/subscription-research-agent/SKILL.md) | Local-first research orchestration, evidence briefs, and Agent-written daily reports. |
| [`packages/research-cli`](./packages/research-cli/README.md) | Node/TypeScript CLI runtime for RSS commands, SQLite research workspaces, evidence archive, and source-health history. |

## Common Workflows

Import OPML, ingest RSS evidence, and generate a brief:

```bash
subscription-research init --workspace research-workspace
subscription-research rss import-opml \
  --opml skills/rss-ai-digest/references/base-feeds.opml \
  --metadata skills/rss-ai-digest/references/source-metadata.json \
  --registry feeds.json
subscription-research ingest rss \
  --workspace research-workspace \
  --registry feeds.json \
  --since 24h \
  --should-keywords "llm,agent,rag,evals,inference" \
  --min-score 7
subscription-research brief evidence \
  --workspace research-workspace \
  --question "AI technology daily" \
  --since 24h
```

Run a direct RSS digest without a research workspace:

```bash
subscription-research rss digest \
  --registry feeds.json \
  --state seen.json \
  --health source-health.json \
  --since 24h \
  --preset ai-strict \
  --format markdown
```

Review source health and generate a curation patch:

```bash
subscription-research source-health \
  --workspace research-workspace \
  --min-observations 2 \
  --disable-threshold 3 \
  --format patch > source-health-curation.json
```

## CLI Surface

The current deterministic runtime is the Node/TypeScript `subscription-research` CLI. It is file-based by design, so agents can pass explicit registry, state, health, output, and workspace paths.

| Command group | Commands |
| --- | --- |
| RSS registry and digest | `rss import-opml`, `rss fetch`, `rss digest`, `rss check-new` |
| Source governance | `rss evaluate-sources`, `rss curate-sources`, `rss apply-source-patch`, `source-health` |
| Research workspace | `init`, `ingest rss`, `brief evidence` |

The CLI prepares deterministic evidence and state. Final research daily reports remain Agent-written synthesis artifacts guided by [`subscription-research-agent/references/daily-report.md`](./skills/subscription-research-agent/references/daily-report.md).

## Boundaries

This repository is not a full RSS reader, hosted research platform, scheduler, notification center, or plugin marketplace package. Those layers can wrap the same Skills later.

Current non-goals:

- Built-in daemon, cron installer, or hosted service.
- Notification adapters for Email, Feishu, Slack, Webhook, or Obsidian.
- Automatic feed discovery.
- Full-text fetching and readability extraction.
- Deterministic CLI generation of final research conclusions.
- Claude/OpenAI/OpenClaw plugin packaging.

## Repository Map

```text
skills/
  rss-ai-digest/
  rss-source-curator/
  subscription-research-agent/
packages/
  research-cli/
docs/
  releases/
  superpowers/
examples/
```

Use `skills/<skill-name>/SKILL.md` as the agent entrypoint. Put schemas, scoring rules, source lists, and workflow references under each Skill's `references/` directory. Keep runtime outputs such as `feeds.json`, `seen.json`, `source-health.json`, `digest.md`, and `research-workspace/` out of Git.

## Documentation

- [Examples](./examples/README.md)
- [Project status](./docs/project-status.zh-CN.md)
- [Implemented features and roadmap](./docs/iteration-roadmap.zh-CN.md)
- [Release checklist](./docs/release-checklist.md)
- [Contributing](./CONTRIBUTING.md)
- [Agent instructions](./AGENTS.md)
- [Claude Code instructions](./CLAUDE.md)

Design and implementation history lives under [`docs/superpowers/`](./docs/superpowers/). Treat it as an archive, not the primary usage guide.

## Development

```bash
cd packages/research-cli && npm test
cd packages/research-cli && npm run typecheck
git diff --check
```

Skill validation, when the local validator is available:

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-source-curator
python3 /path/to/skill-creator/scripts/quick_validate.py skills/subscription-research-agent
```

## Roadmap

Near-term work is focused on real local daily-report validation and report quality. Later extensions should stay modular:

- `rss-feed-discovery`: discover candidate RSS/Atom feeds from sites and curated lists.
- `rss-alert-monitor`: split alert monitoring from daily digests.
- `rss-digest-publisher`: publish reports to external channels after explicit user configuration.
- Plugin wrappers: package the same core contract for specific runtimes without changing Skill behavior.
