# RSS Agent Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[中文说明](./README.zh-CN.md) | [Examples](./examples/README.md) | [Changelog](./CHANGELOG.md)

Portable RSS-related Skills and local-first subscription research workflows for agent ecosystems.

This repository is an RSS Skills suite for agent ecosystems. It is designed for agents that need to import subscriptions, monitor new articles, rank high-signal items, maintain seen-state, review RSS source quality, and prepare evidence briefs without depending on one runtime.

## Status

| Area | Status |
| --- | --- |
| Stable release | `v0.1.0` includes `rss-ai-digest` |
| Current workspace | `rss-ai-digest`, `rss-source-curator`, `subscription-research-agent` |
| Runtime contract | Standard Skill layout plus deterministic local CLIs |
| Release stage | `v0.2.0` is prepared but unreleased; `v0.3.0` is in active development |
| Dependency model | Python standard library for RSS primitives; Node/TypeScript for research workspace tooling |
| Platform support | Agent-runtime neutral; wrappers can be added without changing the Skill core |

## Agent Use Cases

Use `rss-ai-digest` when an agent needs to:

- Turn RSS/Atom feeds into a ranked AI or technical reading digest.
- Import an OPML file into a structured feed registry.
- Monitor new entries by keyword, author, date, category, or language.
- Track seen entries so repeated runs do not report the same item.

Use `rss-source-curator` when an agent needs to:

- Evaluate feed health and source quality over time.
- Generate reviewable source cleanup actions before changing a registry.

Use `subscription-research-agent` when an agent needs to:

- Initialize a local-first research workspace around subscription sources.
- Archive RSS evidence into queryable local memory.
- Generate source-backed evidence briefs for later memo writing.
- Write daily research reports from evidence briefs with source caveats and follow-up questions.

Do not treat this repository as a full RSS reader, notification service, scheduler, hosted research platform, or plugin-marketplace package yet. Those layers can wrap the same Skills later.

## Current Skills

| Skill | Purpose |
| --- | --- |
| `rss-ai-digest` | Discover, filter, score, dedupe, and render high-signal AI/technical reading digests. |
| `rss-source-curator` | Evaluate RSS source quality, review feed health, generate curation actions, and apply reviewed registry patches. |
| `subscription-research-agent` | Orchestrate local-first evidence briefs and Agent-written daily reports from subscription sources. |

## v0.2.0 Prepared Scope

- `rss-ai-digest` now supports deterministic digest presets, keyword groups, and topic-grouped Markdown output.
- `rss-source-curator` owns source governance and registry maintenance workflows.
- `v0.2.0` is prepared for release review and remains unreleased until a release tag is created.

## v0.3.0 Local-First Research Scope

- `subscription-research-agent` adds the high-level orchestration layer for local subscription research workflows.
- Evidence briefs are treated as source-backed context packages, not final research conclusions.
- Daily reports are Agent-written synthesis artifacts produced from evidence briefs, with stable sections for judgments, top items, source health, and follow-up questions.
- The research workspace is local-first and uses SQLite, JSONL, JSON configuration, and Markdown output.
- RSS ingest runs are persisted in SQLite with criteria, worker stats, source health summary, archived counts, and entity link counts.
- Evidence items include conservative commentary-source and original-source attribution when RSS metadata makes that distinction clear.
- The `subscription-research` CLI contract remains file-based so other agent runtimes can wrap it without changing the Skill core.

## Skill Package Layout

```text
skills/rss-ai-digest/
├── SKILL.md
├── agents/openai.yaml
├── references/
│   ├── automation.md
│   ├── base-feeds.opml
│   ├── feed-registry.md
│   ├── scoring.md
│   └── source-metadata.json
└── scripts/rss_monitor.py

skills/rss-source-curator/
├── SKILL.md
├── agents/openai.yaml
└── references/
    ├── registry-maintenance.md
    └── source-governance.md

skills/subscription-research-agent/
├── SKILL.md
├── agents/openai.yaml
└── references/
    ├── daily-report.md
    ├── evidence-brief.md
    └── research-workspace.md
```

Each `SKILL.md` is an agent entrypoint. The Python script remains the deterministic shared implementation behind the Skills, not the product surface.

## Repository Layout

```text
.
├── skills/rss-ai-digest/        # Portable Skill package
├── skills/rss-source-curator/   # Source governance Skill package
├── skills/subscription-research-agent/
│                                  # Local-first research orchestration Skill
├── packages/research-cli/        # v0.3 local research CLI package
├── examples/                    # Agent and Skill invocation examples
├── docs/                        # Project status and design history
├── tests/                       # Regression tests for deterministic behavior
├── AGENTS.md                    # Shared coding-agent instructions
├── CONTRIBUTING.md              # Contribution workflow
├── LICENSE                      # MIT license
└── README.zh-CN.md              # Chinese README
```

## Installation Model

This repository is meant to be consumed as one or more Skill packages:

- Agent runtimes should load or copy the needed directories under `skills/`.
- Use `skills/rss-ai-digest/` for content discovery and digest generation.
- Use `skills/rss-source-curator/` for source governance and registry maintenance.
- Use `skills/subscription-research-agent/` for local-first evidence brief orchestration and daily research report synthesis.
- Humans and maintainers should treat [`README.md`](./README.md), [`AGENTS.md`](./AGENTS.md), and [`CHANGELOG.md`](./CHANGELOG.md) as project-level documents.
- Runtime-specific wrappers should live outside the Skill core unless the project explicitly starts a packaging phase.

## Research CLI

`packages/research-cli/` is the v0.3 local-first `subscription-research` CLI package location. It manages research workspaces, SQLite schema, RSS evidence ingestion, ingest-run metadata, entity extraction, and evidence brief generation. For `v0.3`, it calls the existing Python RSS worker instead of rewriting RSS parsing in TypeScript. Final daily reports remain Agent-written synthesis artifacts, guided by the Skill reference contract.

## Skill Capabilities

`rss-ai-digest` currently supports:

- RSS 2.0 and Atom parsing.
- OPML import with category preservation.
- Curated base OPML for AI, engineering, security, product, and general technical sources.
- Optional source metadata priors for `base_score`, `language`, and `tags`.
- Token-aware keyword matching and phrase matching.
- Deterministic digest presets for AI research, engineering deep dives, security risk, and product/technology workflows.
- Must / should / exclude keyword groups for explicit quality criteria.
- Article scoring with explainable `score_reasons`.
- Deterministic topic assignment and topic-grouped Markdown output.
- Seen-state deduplication.
- Source health persistence and failed-feed reporting.
- Source evaluation and reviewable source curation patches.
- Markdown output for people and JSON output for automation.

## Output Contract

For human-facing tasks, agents should return concise Markdown summaries with title, source, score, link, and selection reason. For automation, use JSON envelopes rather than parsing Markdown.

Digest JSON includes:

- `entries`: ranked reported entries.
- `failures`: feed failures from the current run.
- `health`: merged source health when a health file is provided.
- `stats`: run-level counts for feeds, fetched entries, reported entries, and seen-state updates.
- `generated_at`: UTC timestamp for the run.

## Agent Workflow

1. Choose the relevant Skill entrypoint: [`rss-ai-digest`](./skills/rss-ai-digest/SKILL.md) for content discovery and digests, [`rss-source-curator`](./skills/rss-source-curator/SKILL.md) for source governance, or [`subscription-research-agent`](./skills/subscription-research-agent/SKILL.md) for evidence brief and daily report workflows.
2. Use [`skills/rss-ai-digest/references/base-feeds.opml`](./skills/rss-ai-digest/references/base-feeds.opml) when a starter source list is needed.
3. Keep runtime files such as `feeds.json`, `seen.json`, and `source-health.json` outside Git.
4. Prefer Markdown output for user-facing digests and JSON output for agent pipelines.
5. Review `curate-sources` output before applying any registry patch.

## CLI Contract

Agents and wrappers can call the implementation through `scripts/rss_monitor.py`. Keep this as an implementation contract rather than the main user experience.

The CLI contract is intentionally file-based. Callers pass explicit registry, state, health, patch, and output paths so the same Skill can run under different agent runtimes or schedulers.

| Command | Purpose |
| --- | --- |
| `import-opml` | Convert an OPML file into a feed registry JSON file. |
| `fetch` | Fetch enabled feeds and output normalized entries. |
| `digest` | Fetch, filter, score, dedupe, and render a reading digest. |
| `check-new` | Report new matching entries for monitoring workflows. |
| `evaluate-sources` | Score source quality from registry and health data. |
| `curate-sources` | Generate reviewable source governance actions. |
| `apply-source-patch` | Dry-run or apply reviewed registry patches to an explicit output file. |

The `subscription-research` CLI contract for `v0.3` adds local research workspace commands:

| Command | Purpose |
| --- | --- |
| `init` | Initialize a local research workspace. |
| `ingest rss` | Archive RSS evidence into the research workspace. |
| `brief evidence` | Generate a source-backed evidence brief from local workspace data. |

The CLI does not generate final reports by itself. Agents write daily reports from evidence briefs using the `subscription-research-agent` daily report reference.

Minimal bootstrap:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py import-opml \
  --opml skills/rss-ai-digest/references/base-feeds.opml \
  --metadata skills/rss-ai-digest/references/source-metadata.json \
  --registry feeds.json
```

Typical AI digest:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py digest \
  --registry feeds.json \
  --state seen.json \
  --health source-health.json \
  --since 24h \
  --preset ai-strict \
  --min-score 7 \
  --format markdown
```

Source governance loop:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py curate-sources \
  --registry feeds.json \
  --health source-health.json \
  --format json
```

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py apply-source-patch \
  --registry feeds.json \
  --patch source-curation.json \
  --output feeds.curated.json \
  --apply
```

More prompt-level examples are in [examples/README.md](./examples/README.md).

## Portability Rules

- Keep core behavior platform-neutral.
- Do not make `rss-ai-digest` depend on Codex, Claude, Cursor, OpenClaw, n8n, GitHub Actions, or cron.
- Do not make `subscription-research-agent` depend on Obsidian, a hosted database, or any single notes app.
- Put repeatable behavior in `scripts/`.
- Put schemas, scoring rules, source lists, and automation recipes in `references/`.
- Keep runtime wrappers separate from the Skill core.
- Keep additional RSS Skills aligned with the published suite contract.

## Data And Privacy

- Feed registries, seen-state files, and source-health files may reveal reading interests.
- Runtime files such as `feeds.json`, `seen.json`, `source-health.json`, `digest.md`, and `rss-output/` are ignored by Git by default.
- Research workspaces can include private reading history, entity lists, and draft briefs; keep `research-workspace/` out of Git by default.
- Notification integrations should not send digest or feed data externally unless the user explicitly requests that channel.
- `apply-source-patch` writes only to an explicit output file and should be used after reviewing curation results.

## Documentation

Primary Skill docs:

- [`rss-ai-digest` entrypoint](./skills/rss-ai-digest/SKILL.md)
- [`rss-source-curator` entrypoint](./skills/rss-source-curator/SKILL.md)
- [`subscription-research-agent` entrypoint](./skills/subscription-research-agent/SKILL.md)
- [`rss-ai-digest` feed registry and state schema](./skills/rss-ai-digest/references/feed-registry.md)
- [`rss-ai-digest` scoring rules](./skills/rss-ai-digest/references/scoring.md)
- [`rss-ai-digest` automation recipes](./skills/rss-ai-digest/references/automation.md)
- [`rss-source-curator` source governance](./skills/rss-source-curator/references/source-governance.md)
- [`rss-source-curator` registry maintenance](./skills/rss-source-curator/references/registry-maintenance.md)
- [`subscription-research-agent` research workspace](./skills/subscription-research-agent/references/research-workspace.md)
- [`subscription-research-agent` evidence brief contract](./skills/subscription-research-agent/references/evidence-brief.md)
- [`subscription-research-agent` daily report contract](./skills/subscription-research-agent/references/daily-report.md)
- [`rss-ai-digest` source metadata seed](./skills/rss-ai-digest/references/source-metadata.json)

Project and maintenance docs:

- [Project status](./docs/project-status.zh-CN.md)
- [v0.2.0 release notes](./docs/releases/v0.2.0.md)
- [v0.1.0 release notes](./docs/releases/v0.1.0.md)
- [Agent instructions](./AGENTS.md)
- [Claude Code instructions](./CLAUDE.md)
- [Contributing](./CONTRIBUTING.md)
- [Change log](./CHANGELOG.md)
- [Release checklist](./docs/release-checklist.md)
- [License](./LICENSE)

Design and implementation history lives under [`docs/superpowers/`](./docs/superpowers/). Treat those files as planning and validation archives, not the primary usage guide.

## Development

Run the test suite:

```bash
python3 -m unittest tests/test_rss_monitor.py -v
cd packages/research-cli && npm test
```

Validate the Skill package if the local validator dependencies are available:

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-source-curator
python3 /path/to/skill-creator/scripts/quick_validate.py skills/subscription-research-agent
```

Check basic whitespace issues:

```bash
git diff --check
```

The RSS runtime script uses the Python standard library. The v0.3 research CLI uses Node dependencies isolated under `packages/research-cli/`.

## Roadmap

Likely future Skills or plugin modules:

- `rss-alert-monitor`: keyword, author, project, and topic monitoring.
- `rss-digest-publisher`: publishing to email, Feishu, Slack, Obsidian, or webhooks.
- `rss-feed-discovery`: discovering RSS feeds from sites, GitHub lists, and curated directories.

These should remain separate wrappers or Skills around shared RSS primitives rather than runtime-specific forks of the same workflow.
