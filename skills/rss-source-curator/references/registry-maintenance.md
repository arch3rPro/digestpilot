# Registry Maintenance

Use `curate-sources` to generate curation actions, then review the registry patches before applying them. Commands assume they are run from the repository root.

For the full registry and health schema, see `skills/rss-ai-digest/references/feed-registry.md`.

## Review Report

```bash
subscription-research rss curate-sources \
  --registry feeds.json \
  --health source-health.json \
  --format markdown
```

## Machine Patch

```bash
subscription-research rss curate-sources \
  --registry feeds.json \
  --health source-health.json \
  --format json > source-curation.json
```

When a local research workspace has repeated ingest runs, source-health history can also generate a compatible reviewable patch envelope:

```bash
subscription-research source-health \
  --workspace research-workspace \
  --min-observations 2 \
  --disable-threshold 3 \
  --format patch > source-health-curation.json
```

The patch output follows the same `actions[].registry_patch` shape accepted by `apply-source-patch`. Persistent `disable_candidate` sources become `disable` actions with `enabled: false`; `watch` and `keep` actions do not mutate the registry. By default, disable suggestions require at least three failed observations.

## Dry Run

```bash
subscription-research rss apply-source-patch \
  --registry feeds.json \
  --patch source-curation.json \
  --format markdown
```

## Apply To A New File

```bash
subscription-research rss apply-source-patch \
  --registry feeds.json \
  --patch source-curation.json \
  --output feeds.curated.json \
  --apply \
  --format json
```

Keep generated registries out of Git unless the user explicitly says they are public.
