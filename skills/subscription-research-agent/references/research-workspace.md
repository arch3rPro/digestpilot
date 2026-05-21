# Research Workspace

The workspace is local-first and portable. It uses SQLite for queryable memory, JSONL for the article archive, JSON for configuration, and Markdown for human-readable briefs.

```text
research-workspace/
├── data/
│   ├── research.db
│   ├── articles.jsonl
│   ├── sources.json
│   ├── source-health.json
│   └── seen.json
├── notes/
│   └── briefs/
├── exports/
│   └── json/
└── config/
    ├── workspace.json
    ├── entities.json
    ├── topics.json
    └── research-rules.json
```

Do not assume Obsidian or any single notes app. Markdown output should remain standard Markdown by default.

## Data Model

- `research.db`: queryable local memory for sources, articles, extracted entities, topic assignments, and generated brief metadata.
- `articles.jsonl`: append-friendly archive of normalized subscription entries for auditability and simple replay.
- `sources.json`: RSS registry used by the RSS worker.
- `source-health.json`: source health state from RSS fetch and evaluation runs.
- `seen.json`: dedupe state for subscription entries.
- `config/*.json`: local workspace rules for entities, topics, and research selection.
- `notes/briefs/*.md`: human-readable evidence briefs.
- `exports/json/*.json`: automation-friendly evidence brief exports.

## Portability Rules

- Keep all paths explicit and workspace-relative.
- Treat workspace files as local research data that may reveal reading interests.
- Do not send evidence, source lists, or notes to external systems unless the user explicitly requests that integration.
- Keep final research memo writing separate from deterministic evidence preparation.
