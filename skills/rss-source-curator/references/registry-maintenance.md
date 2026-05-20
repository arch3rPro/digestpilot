# Registry Maintenance

Use `curate-sources` to generate curation actions, then review the registry patches before applying them. Commands assume they are run from the repository root.

For the full registry and health schema, see `skills/rss-ai-digest/references/feed-registry.md`.

## Review Report

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py curate-sources \
  --registry feeds.json \
  --health source-health.json \
  --format markdown
```

## Machine Patch

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py curate-sources \
  --registry feeds.json \
  --health source-health.json \
  --format json > source-curation.json
```

## Dry Run

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py apply-source-patch \
  --registry feeds.json \
  --patch source-curation.json \
  --format markdown
```

## Apply To A New File

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py apply-source-patch \
  --registry feeds.json \
  --patch source-curation.json \
  --output feeds.curated.json \
  --apply \
  --format json
```

Keep generated registries out of Git unless the user explicitly says they are public.
