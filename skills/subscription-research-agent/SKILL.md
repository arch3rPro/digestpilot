---
name: subscription-research-agent
description: Use when an agent needs to run local-first research workflows from subscription sources, initialize a research workspace, archive evidence, generate evidence briefs, or prepare source-backed context for a research memo.
---

# Subscription Research Agent

## Overview

Use this skill to orchestrate local-first research workflows around subscription information channels. Deterministic tools prepare evidence packages; the active Agent writes final analysis from that evidence when the user asks.

## Workflow Selection

- For RSS article discovery or digest generation, use `rss-ai-digest`.
- For source quality and registry maintenance, use `rss-source-curator`.
- For local research workspace setup, run `subscription-research init`.
- For archiving RSS results into the research workspace, run `subscription-research ingest rss`.
- For source-backed research context, run `subscription-research brief evidence`.
- For historical source health review across ingest runs, run `subscription-research source-health`.
- For a daily research report or subscription daily, generate or read an evidence brief first, then follow `references/daily-report.md`.
- For workspace structure, read `references/research-workspace.md`.
- For evidence brief fields, read `references/evidence-brief.md`.
- For daily report quality and structure, read `references/daily-report.md`.

## Core Commands

Initialize a workspace:

```bash
subscription-research init --workspace research-workspace
```

Archive RSS evidence with the default Node RSS runtime:

```bash
subscription-research ingest rss \
  --workspace research-workspace \
  --registry feeds.json \
  --since 24h \
  --keywords "llm,agent,rag,evals,inference" \
  --should-keywords "benchmark,reliability,architecture" \
  --exclude-keywords "webinar,coupon,sponsor,hiring,job,press release" \
  --min-score 7
```

Generate an evidence brief:

```bash
subscription-research brief evidence \
  --workspace research-workspace \
  --question "What changed in LLM evals this week?" \
  --since 7d \
  --must-keywords "llm,evals" \
  --must-keyword-mode all \
  --should-keywords "benchmark,reliability,agent"
```

For broad daily reports, prefer topic words as `--should-keywords` or use `--must-keyword-mode any` so the brief does not require every AI keyword to appear in one article.

Review source health history:

```bash
subscription-research source-health \
  --workspace research-workspace \
  --min-observations 2 \
  --format markdown
```

## Boundaries

This skill does not promise a final research conclusion from deterministic tooling alone. Treat generated briefs as evidence packages. The Agent should cite evidence items when writing a memo or report.

Daily reports are Agent-written synthesis artifacts. The CLI prepares evidence; the Agent owns judgment, recommended reading order, and follow-up questions. Keep source-health details concise in daily reports; use `rss-source-curator` for feed maintenance output.
