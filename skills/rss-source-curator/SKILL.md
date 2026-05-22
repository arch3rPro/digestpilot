---
name: rss-source-curator
description: Use when an agent needs to evaluate RSS source quality, review feed health, generate source curation actions, apply reviewed registry patches, or maintain RSS/OPML source registries.
---

# RSS Source Curator

## Overview

Use this skill to review and maintain RSS source quality. Keep the workflow portable: use explicit registry, health, patch, and output files, and avoid runtime-specific assumptions.

## Workflow Selection

- Run direct registry commands from the repository root with `subscription-research rss`.
- For source quality scoring, use `evaluate-sources`.
- For source health history from a local research workspace, use `subscription-research source-health`.
- For source-health patch proposals from repeated observations, use `subscription-research source-health --format patch`.
- For human review, use `curate-sources --format markdown`.
- For patch application, first generate machine-readable curation with `curate-sources --format json > source-curation.json`, then use `apply-source-patch`.
- For source status semantics, read `references/source-governance.md`.
- For safe registry maintenance, read `references/registry-maintenance.md`.

## Core Commands

Evaluate source quality:

```bash
subscription-research rss evaluate-sources \
  --registry feeds.json \
  --health source-health.json
```

Review repeated source failures from a research workspace:

```bash
subscription-research source-health \
  --workspace research-workspace \
  --min-observations 2 \
  --disable-threshold 3 \
  --format markdown
```

Generate reviewable registry patches from repeated source failures:

```bash
subscription-research source-health \
  --workspace research-workspace \
  --min-observations 2 \
  --disable-threshold 3 \
  --format patch > source-health-curation.json
```

Generate human-readable curation actions:

```bash
subscription-research rss curate-sources \
  --registry feeds.json \
  --health source-health.json \
  --format markdown
```

Generate machine-readable curation patches:

```bash
subscription-research rss curate-sources \
  --registry feeds.json \
  --health source-health.json \
  --format json > source-curation.json
```

Apply reviewed patches to a new registry:

```bash
subscription-research rss apply-source-patch \
  --registry feeds.json \
  --patch source-health-curation.json \
  --output feeds.curated.json \
  --apply
```

## Boundaries

This skill owns source governance, not article digest generation. For daily reading reports or content discovery, use `rss-ai-digest`.

Do not delete, disable, or remove feeds automatically. Generate reviewable actions first, then apply reviewed patches to an explicit output file.
