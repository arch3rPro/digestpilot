# RSS Agent Skills

Portable RSS-related Skills for agent ecosystems. This repository starts with `rss-ai-digest`, a Skill for AI and technical RSS content discovery, and is structured to grow into a broader RSS Skill/plugin toolkit over time.

## What This Repository Is

`rss-agent-skills` is a collection-oriented repository for RSS workflows that agents can use without being tied to one runtime. The current Skill focuses on:

- RSS 2.0 and Atom parsing
- OPML import
- AI and technical content discovery
- New-entry tracking and deduplication
- Article scoring and source quality evaluation
- Markdown and JSON output for human and automation workflows

The project is intentionally platform-neutral. Codex, Claude, OpenClaw, n8n, GitHub Actions, cron, or other systems should be able to wrap the same scripts and Skill instructions.

## Current Skill

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
```

`rss-ai-digest` helps agents turn feeds into ranked reading digests rather than raw feed dumps. It can import OPML, fetch feeds, filter entries, score content, track seen items, and evaluate source quality.

## Quick Start

Import the curated base OPML into a feed registry:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py import-opml \
  --opml skills/rss-ai-digest/references/base-feeds.opml \
  --metadata skills/rss-ai-digest/references/source-metadata.json \
  --registry feeds.json
```

Create a digest of new AI and technical content:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py digest \
  --registry feeds.json \
  --state seen.json \
  --health source-health.json \
  --since 24h \
  --preset ai-strict \
  --min-score 7 \
  --mark-seen reported-only \
  --timeout 20 \
  --max-workers 8 \
  --format markdown
```

Check for new matching entries as JSON:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py check-new \
  --registry feeds.json \
  --state seen.json \
  --health source-health.json \
  --keywords "inference,agents,benchmark" \
  --mark-seen reported-only \
  --timeout 20 \
  --max-workers 8 \
  --format json
```

Evaluate source quality:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py evaluate-sources \
  --registry feeds.json \
  --health source-health.json
```

Generate reviewable source curation actions without modifying the registry:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py curate-sources \
  --registry feeds.json \
  --health source-health.json \
  --format markdown
```

## Curated Base OPML

The starter source list is stored at:

```text
skills/rss-ai-digest/references/base-feeds.opml
```

It currently contains 92 sources grouped into:

- AI, Research, and High-Signal Analysis
- Software Engineering and Systems
- Security and Risk
- Product, Business, and Technology Culture
- General Technical Blogs

When imported, OPML outline groups are preserved as feed `category` values in the generated registry.

Optional source priors are stored at:

```text
skills/rss-ai-digest/references/source-metadata.json
```

Pass this file with `import-opml --metadata` to enrich matching feed ids with `base_score`, `language`, and `tags`.
The seed metadata currently covers selected AI, engineering, security, and commentary sources.

## Output Formats

Use Markdown when a person will read the result:

```bash
--format markdown
```

Use JSON when another agent, scheduler, notification adapter, or workflow engine will consume the result:

```bash
--format json
```

Digest JSON output is an envelope with `entries`, `failures`, `health`, `stats`, and `generated_at`. Markdown output includes run stats and a `Failed feeds` section when any feed fails.

Local runtime artifacts such as `feeds.json`, `seen.json`, `source-health.json`, `digest.md`, and `latest.json` are ignored by Git by default.

Fetch-based commands support `--timeout` and `--max-workers` so scheduled runs can balance speed and source politeness. Output ordering remains deterministic after concurrent fetches.

Use `--preset ai-strict` when a stricter digest should avoid weak summary-only matches or obvious noise. Use `--require-any-title-keyword`, `--exclude-keywords`, and `--keyword-mode all` for custom strict filters.

## Skill Design Principles

- Keep one standard entrypoint per Skill: `skills/<skill-name>/SKILL.md`.
- Put deterministic and repeatable behavior in `scripts/`.
- Put schemas, scoring rules, and automation recipes in `references/`.
- Keep runtime wrappers separate from core behavior.
- Avoid binding the Skill to Codex, Claude, or any single plugin marketplace.

## Documentation

- Skill entrypoint: [`skills/rss-ai-digest/SKILL.md`](./skills/rss-ai-digest/SKILL.md)
- Project status: [`docs/project-status.zh-CN.md`](./docs/project-status.zh-CN.md)
- Feed registry schema: [`skills/rss-ai-digest/references/feed-registry.md`](./skills/rss-ai-digest/references/feed-registry.md)
- Scoring rules: [`skills/rss-ai-digest/references/scoring.md`](./skills/rss-ai-digest/references/scoring.md)
- Source metadata seed: [`skills/rss-ai-digest/references/source-metadata.json`](./skills/rss-ai-digest/references/source-metadata.json)
- Automation recipes: [`skills/rss-ai-digest/references/automation.md`](./skills/rss-ai-digest/references/automation.md)
- Design spec: [`docs/superpowers/specs/2026-05-20-rss-ai-digest-design.md`](./docs/superpowers/specs/2026-05-20-rss-ai-digest-design.md)
- Optimization design: [`docs/superpowers/specs/2026-05-20-rss-ai-digest-optimization-design.md`](./docs/superpowers/specs/2026-05-20-rss-ai-digest-optimization-design.md)
- Post-optimization validation: [`docs/superpowers/specs/2026-05-20-rss-ai-digest-post-optimization-validation.md`](./docs/superpowers/specs/2026-05-20-rss-ai-digest-post-optimization-validation.md)
- Implementation plan: [`docs/superpowers/plans/2026-05-20-rss-ai-digest.md`](./docs/superpowers/plans/2026-05-20-rss-ai-digest.md)
- Remaining optimization plan: [`docs/superpowers/plans/2026-05-20-rss-ai-digest-remaining-optimizations.md`](./docs/superpowers/plans/2026-05-20-rss-ai-digest-remaining-optimizations.md)
- Agent instructions: [`AGENTS.md`](./AGENTS.md)
- Claude Code instructions: [`CLAUDE.md`](./CLAUDE.md)
- Change log: [`CHANGELOG.md`](./CHANGELOG.md)

## Development

Run the test suite:

```bash
python3 -m unittest tests/test_rss_monitor.py -v
```

Validate the Skill package if the local validator dependencies are available:

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
```

The runtime script uses the Python standard library for the MVP. No project dependency installation is required for the included tests.

## Roadmap

Likely future Skills or plugin modules:

- `rss-source-curator`: source cleanup, ranking, and OPML maintenance
- `rss-alert-monitor`: keyword, author, project, and topic monitoring
- `rss-digest-publisher`: publishing to email, Feishu, Slack, Obsidian, or webhooks
- `rss-feed-discovery`: discovering RSS feeds from sites, GitHub lists, and curated directories

These should remain separate wrappers or Skills around shared RSS primitives rather than runtime-specific forks of the same workflow.
