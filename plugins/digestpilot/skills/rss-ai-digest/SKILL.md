---
name: rss-ai-digest
description: Use when an agent needs quick RSS or Atom subscription digests, daily news, key information, OPML import, new AI or technical article discovery, keyword/date/author/category/language filtering, scoring, or seen-item dedupe.
---

# RSS AI Digest

## Overview

Use this skill to turn RSS/Atom feeds and OPML files into high-signal AI and technical reading digests. Keep the workflow portable: use explicit input/output files, produce Markdown or JSON, and avoid runtime-specific assumptions.

## Workflow Selection

- For daily news, key information, quick reading, or "今日/本周重点资讯", run `subscription-research rss digest` and follow `references/digest-report.md`.
- For source cleanup, failed-feed review, source quality, or registry maintenance, use `rss-source-curator` instead of including source-maintenance details in the digest.
- For deep research, evidence briefs, research memos, long-form synthesis, or multi-step investigation, use `subscription-research-agent`.
- For keyword, author, project, or topic monitoring, run `subscription-research rss check-new`.
- For OPML import, run `subscription-research rss import-opml`, then use the resulting registry for digest or monitoring.
- For scheduled checks, read `references/automation.md` and provide a platform-neutral recipe.

## Runtime Command

Examples use the current development command `subscription-research`. Before running commands, resolve the runtime command:

- Use `DIGESTPILOT_RUNTIME_CMD` when the environment provides a custom runtime command.
- Use `subscription-research` when it is available on `PATH`.
- From a repository checkout without a linked command, replace `subscription-research` with `node packages/research-cli/dist/src/cli.js`.
- Run `node scripts/doctor.mjs` from the repository root to diagnose local runtime setup.

## Core Commands

Import OPML into a registry:

```bash
subscription-research rss import-opml \
  --opml feeds.opml \
  --metadata skills/rss-ai-digest/references/source-metadata.json \
  --registry feeds.json
```

Create a digest of new high-quality AI/technical entries:

```bash
subscription-research rss digest \
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

Check for new matching entries without a minimum score gate:

```bash
subscription-research rss check-new \
  --registry feeds.json \
  --state seen.json \
  --health source-health.json \
  --keywords "evals,inference,agents" \
  --mark-seen reported-only \
  --timeout 20 \
  --max-workers 8 \
  --format json
```

## Output Guidance

For user-facing daily digests, summarize the ranked entries instead of dumping raw feed data. Include title, source, link, short summary, and why it matters. Keep it focused on the subscribed information itself.

Do not add source maintenance sections, failed-feed lists, registry repair advice, or source-health recommendations to ordinary daily digests. Mention coverage only as a short caveat when failures materially affect the news selection.

Do not add research follow-up questions to ordinary daily digests unless the user asks for deep research or tracking questions. Route research follow-up to `subscription-research-agent`.

For automation, prefer `--format json` and pass the result envelope to the next tool or notification adapter. Digest JSON contains `entries`, `failures`, `health`, `stats`, and `generated_at`. Do not assume a specific notification channel unless the user asks for one.

Use `--mark-seen reported-only` for normal digests so only surfaced entries are deduped. Use `--mark-seen none` for dry runs and scoring experiments. Use `--mark-seen all-filtered` only when the user wants the old behavior of suppressing every filtered new item even if it is not reported.

Use `--timeout` and `--max-workers` on fetch-based commands to control slow sources and concurrent fetches. Results are sorted after fetching, so concurrent runs remain stable enough for diffs and automation.

Keyword matching is token-aware for single words and phrase-aware for multi-word keywords. Prefer specific keywords such as `agent`, `llm`, `rag`, `evals`, `inference`, `benchmark`, and project names. The script records `matched_keywords` and `matched_keyword_locations` so the agent can explain whether a match came from the title or summary.

For stricter AI digests, prefer `--preset ai-strict`. Use `--require-any-title-keyword` to suppress summary-only matches, `--exclude-keywords` to remove obvious noise, and `--keyword-mode all` when every requested keyword must match.

For higher-quality digests, use presets such as `ai-research`, `engineering-deep-dive`, `security-risk`, or `product-tech`. Use `--must-keywords`, `--should-keywords`, and `--exclude-keywords` when the user provides explicit quality criteria.

Markdown digests are grouped by deterministic topics. JSON entries include `topic` for downstream routing.

Use `rss-source-curator` for source maintenance recommendations, registry patch review, failed-feed triage, and source-health governance.

## References

- Read `references/feed-registry.md` when creating registry, seen-state, or source-health files for digest and monitoring runs.
- Read `references/scoring.md` when tuning article scores.
- Read `references/digest-report.md` when writing user-facing daily news, key information, or quick reading digests.
- Read `references/automation.md` when setting up cron, GitHub Actions, Codex automation, Claude plugin wrappers, n8n, or another scheduler.
- Use `references/base-feeds.opml` as the curated starter OPML for AI, engineering, security, product, and general technical sources.
- Use `references/source-metadata.json` with `import-opml --metadata` when the registry should start with curated source priors.
