---
name: rss-ai-digest
description: Use when an agent needs to import OPML, parse RSS or Atom feeds, monitor new AI or technical articles, filter entries by keyword/date/author/category/language, score article quality, dedupe seen items, or evaluate RSS source quality for high-signal technology content discovery.
---

# RSS AI Digest

## Overview

Use this skill to turn RSS/Atom feeds and OPML files into high-signal AI and technical reading digests. Keep the workflow portable: use explicit input/output files, produce Markdown or JSON, and avoid runtime-specific assumptions.

## Workflow Selection

- For a daily or weekly reading report, run `scripts/rss_monitor.py digest`.
- For keyword, author, project, or topic monitoring, run `scripts/rss_monitor.py check-new`.
- For OPML import, run `scripts/rss_monitor.py import-opml`, then evaluate the resulting registry.
- For source cleanup or feed quality review, run `scripts/rss_monitor.py evaluate-sources`.
- For scheduled checks, read `references/automation.md` and provide a platform-neutral recipe.

## Core Commands

Import OPML into a registry:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py import-opml \
  --opml feeds.opml \
  --metadata skills/rss-ai-digest/references/source-metadata.json \
  --registry feeds.json
```

Create a digest of new high-quality AI/technical entries:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py digest \
  --registry feeds.json \
  --state seen.json \
  --health source-health.json \
  --since 24h \
  --keywords "agent,llm,rag" \
  --require-any-title-keyword \
  --exclude-keywords "webinar,coupon,sponsor" \
  --min-score 7 \
  --mark-seen reported-only \
  --timeout 20 \
  --max-workers 8 \
  --format markdown
```

Check for new matching entries without a minimum score gate:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py check-new \
  --registry feeds.json \
  --state seen.json \
  --health source-health.json \
  --keywords "evals,inference,agents" \
  --mark-seen reported-only \
  --timeout 20 \
  --max-workers 8 \
  --format json
```

Evaluate feed quality:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py evaluate-sources \
  --registry feeds.json \
  --health source-health.json
```

## Output Guidance

For user-facing answers, summarize the ranked entries instead of dumping raw feed data. Include title, link, source, score, and the reason the entry was selected. Mention failed feeds separately so source problems are visible.

For automation, prefer `--format json` and pass the result envelope to the next tool or notification adapter. Digest JSON contains `entries`, `failures`, `health`, `stats`, and `generated_at`. Do not assume a specific notification channel unless the user asks for one.

Use `--mark-seen reported-only` for normal digests so only surfaced entries are deduped. Use `--mark-seen none` for dry runs and scoring experiments. Use `--mark-seen all-filtered` only when the user wants the old behavior of suppressing every filtered new item even if it is not reported.

Use `--timeout` and `--max-workers` on fetch-based commands to control slow sources and concurrent fetches. Results are sorted after fetching, so concurrent runs remain stable enough for diffs and automation.

Keyword matching is token-aware for single words and phrase-aware for multi-word keywords. Prefer specific keywords such as `agent`, `llm`, `rag`, `evals`, `inference`, `benchmark`, and project names. The script records `matched_keywords` and `matched_keyword_locations` so the agent can explain whether a match came from the title or summary.

For stricter AI digests, use `--require-any-title-keyword` to suppress summary-only matches, `--exclude-keywords` to remove obvious noise, and `--keyword-mode all` when every requested keyword must match.

## References

- Read `references/feed-registry.md` when creating or modifying registry, seen-state, or source-health files.
- Read `references/scoring.md` when tuning article scores or source quality recommendations.
- Read `references/automation.md` when setting up cron, GitHub Actions, Codex automation, Claude plugin wrappers, n8n, or another scheduler.
- Use `references/base-feeds.opml` as the curated starter OPML for AI, engineering, security, product, and general technical sources.
- Use `references/source-metadata.json` with `import-opml --metadata` when the registry should start with curated source priors.
