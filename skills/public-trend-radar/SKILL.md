---
name: public-trend-radar
description: Use when an agent needs public-channel trend discovery, trend cards, AI/technical trend signals, product/business trend signals, or open public sources as upstream context.
---

# Public Trend Radar

## Overview

Use this skill to discover public-channel trend signals and produce trend cards. Keep trend discovery separate from ordinary RSS daily reports, source governance, publishing, and final research synthesis.

## Workflow Selection

- For public trend discovery, run `subscription-research trend scan`.
- For AI and technical trends, use `--profile ai-tech`.
- For product, launch, market, or product-management trends, use `--profile product-business`.
- For ordinary subscribed RSS daily news, use `rss-ai-digest`.
- For source quality and registry maintenance, use `rss-source-curator`.
- For deep research synthesis from evidence, use `subscription-research-agent`.

## Core Command

Generate trend cards from a public URL list:

```bash
subscription-research trend scan \
  --profile ai-tech \
  --web-url-list candidate-pages.md \
  --window 7d \
  --format markdown
```

Generate product/business trend cards:

```bash
subscription-research trend scan \
  --profile product-business \
  --web-url-list launch-pages.md \
  --window 7d \
  --format json
```

When fixture or exported public data is available, `trend scan` can also consume public Hacker News item JSON and GitHub release JSON:

```bash
subscription-research trend scan \
  --profile ai-tech \
  --hacker-news-items hn-items.json \
  --github-releases github-releases.json \
  --format markdown
```

## Output Guidance

Trend cards are upstream signals. They should explain what appears to be rising, why it matters, which public evidence supports it, and what downstream action is reasonable.

Do not rewrite trend cards into a daily report unless the user asks for a digest. If the user asks for a daily report, pass trend cards to `rss-ai-digest` or the active Agent as one input section.

Do not include private channels, personal browser history, private email, or private community data in this skill. Keep the first implementation limited to public channels.

Do not publish, notify, or update watchlists automatically. Use trend cards as reviewable output.

## Profiles

- `ai-tech`: AI systems, models, agents, LLM infrastructure, papers, repos, datasets, benchmarks, developer tools, and engineering signals.
- `product-business`: AI products, launches, pricing, packaging, product positioning, company updates, integrations, growth signals, and product-management context.

## Boundaries

This skill does not maintain RSS source registries, generate final research conclusions, or send notifications. It creates trend cards from public-channel signals for downstream Agent workflows.
