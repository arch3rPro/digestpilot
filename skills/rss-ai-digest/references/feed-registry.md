# Feed Registry And State

Use JSON for the MVP because every Agent runtime can parse it without optional dependencies.

Use `base-feeds.opml` as the starter OPML when the user wants a ready-made AI and technical source list. Its outline groups are preserved as feed `category` values during `import-opml`.

Use `source-metadata.json` with `import-opml --metadata` when the starter registry should include curated source priors.

## Feed Registry

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

- `id`: stable unique feed id. Use lowercase hyphen-case.
- `title`: readable source name.
- `url`: RSS or Atom URL.
- `enabled`: set `false` to keep a source in the registry but skip fetching.

Recommended fields:

- `category`: broad buckets such as `ai`, `engineering`, `programming`, `product`, `research`, or `security`.
- `language`: expected language such as `en` or `zh`.
- `base_score`: source prior from 1 to 10.
- `tags`: operational labels such as `must-read`, `watch`, `noisy`, or `deprecated`.

## Source Metadata

`source-metadata.json` is a seed file keyed by feed id:

```json
{
  "simonwillison-net": {
    "base_score": 9,
    "language": "en",
    "tags": ["must-read", "llm", "engineering"]
  }
}
```

When passed to `import-opml --metadata`, matching feed ids are enriched with:

- `base_score`: curated prior from 1 to 10.
- `language`: expected source language.
- `tags`: stable source labels for scoring and source governance.

Keep source metadata conservative. It should express durable source priors, not one-off article judgments.

## Seen State

Use a configurable state path, not a hidden app-specific directory.

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

Entry identity is derived from:

1. Canonical link URL.
2. Feed id plus GUID.
3. Feed id plus normalized title plus published date.

## Source Health

```json
{
  "simon-willison": {
    "status": "healthy",
    "success_count": 3,
    "failure_count": 0,
    "last_success_at": "2026-05-20T09:00:00+08:00",
    "last_error_at": "",
    "last_error": "",
    "last_item_at": "2026-05-20T08:35:00+08:00",
    "quality_avg": 8.4
  }
}
```

Use `--health source-health.json` with `digest` or `check-new` to persist live fetch outcomes. The CLI merges current results into existing health data instead of replacing the file with a single run.

Health fields:

- `status`: current observed state such as `healthy`, `degraded`, `failing`, or `unknown`.
- `success_count`: number of successful fetch observations.
- `failure_count`: number of failed fetch observations.
- `last_success_at`: most recent successful fetch timestamp.
- `last_error_at`: most recent failed fetch timestamp.
- `last_error`: most recent error message.
- `last_item_at`: newest item timestamp observed from that feed.
- `quality_avg`: optional score trend used by source evaluation.

Use health data to explain source recommendations. Do not remove a source automatically unless the user explicitly asks for cleanup.

## Source Evaluation Output

`evaluate-sources` combines registry priors and persisted health into governance rows:

```json
{
  "id": "simonwillison-net",
  "title": "Simon Willison's Weblog",
  "url": "https://simonwillison.net/atom/everything/",
  "enabled": true,
  "status": "healthy",
  "score": 9,
  "recommendation": "keep",
  "recommendation_reason": "High quality source with recent successful fetches.",
  "failure_count": 0,
  "success_count": 4,
  "last_error": ""
}
```

Recommendation semantics:

- `keep`: stable high-quality source.
- `watch`: useful or unknown source that needs more observations.
- `lower-priority`: relevant but noisy, low-quality, or intermittently failing.
- `remove`: repeatedly failing, deprecated, disabled, or clearly low-signal.

Missing health is reported as `status: "unknown"` with `recommendation: "watch"` instead of being treated as low quality.

## Source Curation Output

`curate-sources` turns source evaluation into reviewable maintenance actions. It does not modify the registry.

```json
{
  "actions": [
    {
      "id": "example-feed",
      "title": "Example Feed",
      "action": "disable",
      "status": "failing",
      "score": 2,
      "reason": "Repeated failures without successful fetches.",
      "registry_patch": {
        "id": "example-feed",
        "set": {
          "enabled": false
        }
      }
    }
  ],
  "summary": {
    "disable": 1
  }
}
```

Curation actions:

- `keep`: no registry change suggested.
- `watch`: gather more health observations before changing priority.
- `lower-priority`: source may need a lower `base_score` or `noisy` tag in a future metadata pass.
- `disable`: repeated failures suggest setting `enabled` to `false` after review.
- `remove`: source is a removal candidate, but deletion should remain explicit and human/agent-reviewed.

## Applying Source Patches

`apply-source-patch` safely turns reviewed curation output into a new registry. It accepts either a `curate-sources --format json` envelope or a direct list of patch objects.

Patch object shape:

```json
{
  "id": "example-feed",
  "set": {
    "enabled": false
  }
}
```

Removal patch shape:

```json
{
  "id": "example-feed",
  "remove": true
}
```

Dry-run by default:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py apply-source-patch \
  --registry feeds.json \
  --patch source-curation.json \
  --format markdown
```

Write a reviewed registry to an explicit output file:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py apply-source-patch \
  --registry feeds.json \
  --patch source-curation.json \
  --output feeds.curated.json \
  --apply \
  --format json
```

The command does not overwrite the input registry unless the caller explicitly uses the same path for `--output`.

## Digest JSON Envelope

`digest --format json` and `check-new --format json` return an object rather than a raw list:

```json
{
  "entries": [],
  "failures": [],
  "health": {},
  "stats": {
    "feeds_total": 92,
    "feeds_enabled": 92,
    "feeds_success": 89,
    "feeds_failed": 3,
    "entries_fetched": 420,
    "entries_filtered": 18,
    "entries_reported": 9,
    "entries_marked_seen": 9
  },
  "generated_at": "2026-05-20T09:00:00+00:00"
}
```

Markdown digest output includes run stats and a `Failed feeds` section when any feed fails during the current run.
