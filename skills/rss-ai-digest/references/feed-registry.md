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
    "last_success_at": "2026-05-20T09:00:00+08:00",
    "failure_count": 0,
    "last_item_at": "2026-05-20T08:35:00+08:00",
    "quality_avg": 8.4
  }
}
```

Use health data to explain source recommendations. Do not remove a source automatically unless the user explicitly asks for cleanup.
