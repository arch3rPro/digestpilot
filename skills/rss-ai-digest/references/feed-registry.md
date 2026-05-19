# Feed Registry And State

Use JSON for the MVP because every Agent runtime can parse it without optional dependencies.

Use `base-feeds.opml` as the starter OPML when the user wants a ready-made AI and technical source list. Its outline groups are preserved as feed `category` values during `import-opml`.

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

- `status`: current observed state such as `healthy` or `failing`.
- `success_count`: number of successful fetch observations.
- `failure_count`: number of failed fetch observations.
- `last_success_at`: most recent successful fetch timestamp.
- `last_error_at`: most recent failed fetch timestamp.
- `last_error`: most recent error message.
- `last_item_at`: newest item timestamp observed from that feed.
- `quality_avg`: optional score trend used by source evaluation.

Use health data to explain source recommendations. Do not remove a source automatically unless the user explicitly asks for cleanup.

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
