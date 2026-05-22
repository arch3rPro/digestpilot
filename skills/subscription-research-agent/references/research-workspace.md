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
│   ├── briefs/
│   └── daily/
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

- `research.db`: queryable local memory for sources, articles, source attribution, extracted entities, topic assignments, RSS ingest runs, and generated brief metadata.
- `articles.jsonl`: append-friendly archive of normalized subscription entries for auditability and simple replay.
- `sources.json`: RSS registry used by the RSS worker.
- `source-health.json`: source health state from RSS fetch and evaluation runs.
- `seen.json`: dedupe state for subscription entries.
- `config/*.json`: local workspace rules for entities, topics, and research selection.
- `notes/briefs/*.md`: human-readable evidence briefs.
- `notes/daily/*.md`: Agent-written research dailies synthesized from evidence briefs.
- `exports/json/*.json`: automation-friendly evidence brief exports.

## Research Runs

The `research_runs` table records both deterministic ingest runs and evidence brief runs. The `source_health_observations` table records per-source health snapshots from each RSS ingest run.

For RSS ingest runs, rows use `run_type = rss_ingest` and include:

- `time_window`: ingest window such as `24h` or `7d`.
- `criteria_json`: channel, registry path, keyword criteria, and score threshold.
- `stats_json`: RSS worker run statistics such as feed counts and reported entries.
- `source_health_summary_json`: checked, succeeded, failed, and failed source samples.
- `archived_count`: number of entries archived into the workspace.
- `entity_link_count`: number of article/entity links created.

For evidence brief runs, rows use the default `run_type = evidence` and include output Markdown and JSON paths.

Use `subscription-research source-health` to summarize repeated observations into `keep`, `watch`, `lower_priority`, and `disable_candidate` recommendations. Treat this as source-governance context, not ordinary digest content. Route source maintenance output to `rss-source-curator`.

## Article Attribution

The `articles` table stores conservative source attribution fields:

- `source_id`: the subscription feed source.
- `commentary_source`: the commentary or secondary source when detected.
- `original_source`: the original reporting, filing, paper, or quoted source when detected.
- `original_url`: the original URL only when explicitly available.

Attribution is intentionally conservative. If the system cannot distinguish an original source from RSS metadata, these fields remain empty rather than guessing.

## Portability Rules

- Keep all paths explicit and workspace-relative.
- Treat workspace files as local research data that may reveal reading interests.
- Do not send evidence, source lists, or notes to external systems unless the user explicitly requests that integration.
- Keep final research memo writing separate from deterministic evidence preparation.
