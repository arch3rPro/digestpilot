---
name: rss-source-curator
description: Use when an agent needs to evaluate RSS source quality, review feed health, generate source curation actions, apply reviewed registry patches, or maintain RSS/OPML source registries.
---

# RSS Source Curator

## Overview

Use this skill to review and maintain RSS source quality. Keep the workflow portable: use explicit registry, health, patch, and output files, and avoid runtime-specific assumptions.

## Workflow Selection

- Run commands from the repository root with `python3 skills/rss-ai-digest/scripts/rss_monitor.py`.
- For source quality scoring, use `evaluate-sources`.
- For human review, use `curate-sources --format markdown`.
- For patch application, first generate machine-readable curation with `curate-sources --format json > source-curation.json`, then use `apply-source-patch`.
- For source status semantics, read `references/source-governance.md`.
- For safe registry maintenance, read `references/registry-maintenance.md`.

## Core Commands

Evaluate source quality:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py evaluate-sources \
  --registry feeds.json \
  --health source-health.json
```

Generate human-readable curation actions:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py curate-sources \
  --registry feeds.json \
  --health source-health.json \
  --format markdown
```

Generate machine-readable curation patches:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py curate-sources \
  --registry feeds.json \
  --health source-health.json \
  --format json > source-curation.json
```

Apply reviewed patches to a new registry:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py apply-source-patch \
  --registry feeds.json \
  --patch source-curation.json \
  --output feeds.curated.json \
  --apply
```

## Boundaries

This skill owns source governance, not article digest generation. For daily reading reports or content discovery, use `rss-ai-digest`.

Do not delete, disable, or remove feeds automatically. Generate reviewable actions first, then apply reviewed patches to an explicit output file.
