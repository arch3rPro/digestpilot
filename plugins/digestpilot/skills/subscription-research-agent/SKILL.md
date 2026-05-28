---
name: subscription-research-agent
description: Use when an agent needs deep research from subscription sources, local research workspaces, archived evidence, evidence briefs, source-backed research memos, hypothesis tracking, or multi-step synthesis.
---

# Subscription Research Agent

## Overview

Use this skill to orchestrate local-first research workflows around subscription information channels. Deterministic tools prepare evidence packages; the active Agent writes final analysis from that evidence when the user asks.

## Workflow Selection

- For RSS article discovery, daily news, key information, or quick digest generation, use `rss-ai-digest`.
- For source quality and registry maintenance, use `rss-source-curator`.
- For local research workspace setup, run `subscription-research init`.
- For archiving RSS results into the research workspace, run `subscription-research ingest rss`.
- For optional full-text evidence enrichment, run `subscription-research content fetch` after RSS ingest and before generating the evidence brief.
- For source-backed research context, run `subscription-research brief evidence`.
- For historical source health review, failed-feed analysis, or registry maintenance, use `rss-source-curator`.
- For a research daily, deep-dive memo, or source-backed synthesis, generate or read an evidence brief first, then follow `references/daily-report.md`.
- For workspace structure, read `references/research-workspace.md`.
- For evidence brief fields, read `references/evidence-brief.md`.
- For daily report structure, read `references/daily-report.md`.
- For the daily report quality gate, read `references/daily-report-quality.md`.

## Runtime Command

Examples use the current development command `subscription-research`. Before running commands, resolve the runtime command:

- Use `DIGESTPILOT_RUNTIME_CMD` when the environment provides a custom runtime command.
- Use `subscription-research` when it is available on `PATH`.
- From a repository checkout without a linked command, replace `subscription-research` with `node packages/research-cli/dist/src/cli.js`.
- Run `node scripts/doctor.mjs` from the repository root to diagnose local runtime setup.

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

Optionally enrich archived articles with readable full text:

```bash
subscription-research content fetch \
  --workspace research-workspace \
  --since 7d \
  --min-score 7 \
  --limit 20 \
  --timeout 20
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

For broad research dailies, prefer topic words as `--should-keywords` or use `--must-keyword-mode any` so the brief does not require every AI keyword to appear in one article.

Source-health history can be used as research context only when it materially changes evidence confidence. For source maintenance reports or failed-feed triage, route to `rss-source-curator`.

## Boundaries

This skill does not promise a final research conclusion from deterministic tooling alone. Treat generated briefs as evidence packages. The Agent should cite evidence items when writing a memo or report.

Research dailies and memos are Agent-written synthesis artifacts. The CLI prepares evidence; the Agent owns judgment, recommended reading order, and follow-up questions.

Full-text enrichment is optional and local-first. Use it when RSS summaries are too thin for research synthesis. Do not require it for ordinary RSS daily news or quick key-information lookups.

Do not use this skill for ordinary RSS daily news or quick key-information lookups. Those should stay in `rss-ai-digest`. Use `rss-source-curator` for feed maintenance output.
