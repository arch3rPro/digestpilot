# RSS AI Digest Skill Design

## Purpose

`rss-ai-digest` is a portable Agent Skill for AI and technical RSS content discovery. It helps agents collect RSS/Atom entries, import OPML subscriptions, track new items, score article quality, and evaluate source quality so users can maintain a high-signal technical reading workflow.

The skill is designed for the general Agent ecosystem. It must not depend on Codex, Claude, Cursor, OpenClaw, or any single runtime. Future Claude plugin or plugin-marketplace packaging should wrap this skill rather than change its core behavior.

## Product Positioning

The skill is not a full RSS reader. It is a monitoring and curation workflow for high-quality AI and technology sources.

Primary jobs:

- Find high-signal new AI and technical content from RSS/Atom feeds.
- Import and normalize feed URLs from OPML files.
- Filter entries by keyword, date, author, category, and language.
- Track seen entries to avoid duplicate reports.
- Score articles for relevance, depth, source quality, and noise.
- Evaluate feed quality and health over time.
- Produce Markdown for human reading and JSON for downstream automation.

## Current Scope

MVP capabilities:

- Parse RSS 2.0 and Atom feeds.
- Read OPML files and extract subscription URLs.
- Maintain a feed registry with categories, tags, language, base score, and enabled status.
- Filter entries by date window, keywords, author, category, and language.
- Track seen or processed entries in a configurable local state file.
- Generate AI and technical digest reports from new items.
- Score articles with deterministic heuristics and agent-readable rationale.
- Evaluate source health and source quality.
- Provide cron and automation recipes as reference material.

Out of scope for MVP:

- Full web UI.
- Full-text extraction from article pages.
- Required LLM summarization.
- Built-in email, Slack, Feishu, or webhook delivery.
- Claude plugin manifest, plugin marketplace bundle, or installer.
- Hosted feed service or multi-user backend.

## Skill Packaging

Use the standard one-folder-per-skill layout:

```text
skills/rss-ai-digest/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── scripts/
│   └── rss_monitor.py
└── references/
    ├── feed-registry.md
    ├── scoring.md
    ├── automation.md
    └── base-feeds.opml
```

`SKILL.md` is the only required entrypoint. It should stay concise and focus on task routing, workflow selection, and script usage. Detailed schemas, scoring rules, and automation recipes belong in `references/`.

`agents/openai.yaml` is optional UI metadata for OpenAI/Codex-style skill lists. It must not contain core behavior. The skill must still work without it.

## Script Interface

The deterministic core should live in `scripts/rss_monitor.py`. It should use subcommands so one skill can support multiple workflows while remaining easy to split later.

Proposed commands:

```bash
rss_monitor.py import-opml --opml feeds.opml --registry feeds.json
rss_monitor.py fetch --registry feeds.json --format json
rss_monitor.py digest --registry feeds.json --state seen.json --since 24h --min-score 7 --format markdown
rss_monitor.py check-new --registry feeds.json --state seen.json --keywords "agent,llm,rag"
rss_monitor.py evaluate-sources --registry feeds.json --health source-health.json
```

Output formats:

- `markdown`: human-readable report, suitable for daily or weekly reading.
- `json`: machine-readable payload, suitable for automation or another agent step.

Design constraints:

- Accept explicit file paths for registry, state, and health files.
- Avoid hidden runtime-specific directories.
- Prefer Python standard library for MVP. If dependencies are added later, document them in `SKILL.md` or a reference file.
- Make failures visible in output instead of silently dropping failed feeds.

## Feed Registry

The feed registry is the durable source list. It should be JSON or YAML. JSON is preferred for the MVP because it is easy for agents and scripts to parse without optional dependencies.

Example:

```json
{
  "feeds": [
    {
      "id": "simon-willison",
      "title": "Simon Willison",
      "url": "https://simonwillison.net/atom/everything/",
      "category": ["ai", "engineering"],
      "language": "en",
      "base_score": 9,
      "tags": ["must-read", "llm"],
      "enabled": true
    }
  ]
}
```

Required fields:

- `id`: stable unique feed identifier.
- `title`: human-readable source name.
- `url`: RSS or Atom feed URL.
- `enabled`: whether this source should be checked.

Recommended fields:

- `category`: broad content category such as `ai`, `engineering`, `programming`, `product`, or `research`.
- `language`: expected source language.
- `base_score`: source prior quality score from 1 to 10.
- `tags`: operational tags such as `must-read`, `watch`, `noisy`, or `deprecated`.

## State Files

The seen state prevents duplicate reports.

Example:

```json
{
  "seen": {
    "entry_hash": {
      "first_seen_at": "2026-05-20T09:00:00+08:00",
      "feed_id": "simon-willison",
      "title": "Example"
    }
  }
}
```

Entry identity should be derived from stable fields in this order:

1. Canonical link URL.
2. Feed URL plus GUID.
3. Feed URL plus normalized title plus published date.

The health state records source availability and quality trend.

Example:

```json
{
  "simon-willison": {
    "last_success_at": "2026-05-20T09:00:00+08:00",
    "failure_count": 0,
    "last_item_at": "2026-05-20T08:35:00+08:00",
    "quality_avg": 8.4
  }
}
```

## Article Scoring

Use a 10-point article score. The MVP should use deterministic heuristics and explain the reason for each score.

Positive signals:

- AI, LLM, Agent, RAG, model, evaluation, infrastructure, or engineering practice relevance.
- Original research, implementation notes, system design, incident review, benchmark, or open-source release.
- Recognized high-quality source or manually high `base_score`.
- Recent publication within the requested time window.
- Specific technical terms, code, architecture, data, or reproducible process.

Negative signals:

- Marketing-heavy or generic announcement content.
- Reposted news without additional analysis.
- Job posts, event promotions, sponsor posts, or thin listicles.
- Duplicate content across feeds.
- Missing link, missing title, or malformed metadata.

Recommended output fields:

- `score`
- `title`
- `link`
- `feed_id`
- `feed_title`
- `published_at`
- `author`
- `matched_keywords`
- `score_reasons`
- `noise_flags`

## Source Evaluation

Use a 10-point source score. Source scoring should help users keep a high-quality feed library.

Signals:

- Availability: recent successful fetches, low failure rate, reasonable response time.
- Freshness: source updates regularly but is not noisy.
- Quality: recent entries have a high average article score.
- Relevance: source consistently matches AI and technical topics.
- Originality: low duplicate rate and low repost rate.
- Manual tags: `must-read` boosts, `noisy` and `deprecated` penalize.

Source recommendations:

- `keep`: stable high-quality source.
- `watch`: promising source or source with mixed signal.
- `lower-priority`: useful but noisy or irregular.
- `remove`: dead, irrelevant, or consistently low-quality source.

## Agent Workflow

The skill should route user requests by intent.

Digest requests:

- Use when the user asks what is worth reading today, this week, or in a recent time window.
- Run `digest`.
- Return a concise ranked list with links, score, source, and recommendation reason.

Monitoring requests:

- Use when the user asks to watch keywords, authors, projects, or topics.
- Run `check-new`.
- Return only new matching entries unless the user asks for historical results.

OPML import requests:

- Use when the user provides an OPML file or asks to import subscriptions.
- Run `import-opml`.
- Then optionally run `evaluate-sources` to identify dead or low-quality sources.

Source curation requests:

- Use when the user asks to assess, clean, rank, or improve a feed list.
- Run `evaluate-sources`.
- Return keep/watch/lower-priority/remove recommendations.

Automation requests:

- Use when the user asks to run checks periodically.
- Read `references/automation.md`.
- Provide a cron, GitHub Actions, local scheduler, or platform-specific recipe.
- Do not require one specific Agent runtime.

## Future Skill Split

Do not split the MVP into multiple skills. Start with one modular skill because the workflows share the same registry, state, health data, and scoring model.

Future split candidates:

- `rss-ai-digest`: daily and weekly high-signal reading reports.
- `rss-source-curator`: OPML import, source cleanup, source quality scoring.
- `rss-alert-monitor`: keyword, author, project, and topic monitoring.
- `rss-digest-publisher`: publishing reports to email, Feishu, Slack, Obsidian, or webhooks.
- `rss-feed-discovery`: discovering RSS feeds from websites, GitHub lists, blogs, and curated directories.

When plugin-marketplace packaging is needed, publish these as separate skills inside one bundle instead of merging marketplace concerns into the core skill.

## References To Borrow From

Borrow ideas, not implementation:

- `rookie-ricardo/erduo-skills`: simple skill structure, RSS digest workflow, OPML-backed feed list.
- `ginobefun/BestBlogs`: high-quality content aggregation, OPML sharing, category filtering, score-based reading experience.

The starter OPML should be maintained as `references/base-feeds.opml`, using grouped outlines for AI, engineering, security, product/technology culture, and general technical blogs.

## Acceptance Criteria

The design is ready for implementation when:

- The skill has a single standard entrypoint at `skills/rss-ai-digest/SKILL.md`.
- The core script can parse RSS, Atom, and OPML without relying on one Agent runtime.
- Digest output includes ranked entries with reasons, not just raw feed items.
- Seen state prevents duplicate results across repeated runs.
- Source evaluation can identify failed, noisy, and high-quality feeds.
- Markdown and JSON outputs are both supported.
- Automation guidance is documented without hard-binding to Codex or Claude.
- Future Claude plugin or marketplace packaging can wrap the skill without changing core behavior.
