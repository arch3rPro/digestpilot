# Local-First Subscription Research Agent Design

Date: 2026-05-21

## Background

`rss-agent-skills` has reached a stable RSS Skills suite shape. `rss-ai-digest` owns RSS/Atom/OPML ingestion, article filtering, scoring, dedupe, digest rendering, and JSON envelopes. `rss-source-curator` owns source quality review and registry maintenance workflows. `v0.2.0` is prepared as an unreleased checkpoint for this suite.

The next stage should not keep expanding the project as a generic RSS utility. The larger goal is a local-first research Agent built around subscription information channels. RSS remains the first channel, but the product direction is evidence-based research: discover useful signals, archive source material, organize evidence, and give an Agent reliable context for writing research memos.

## Product Direction

Build a local-first subscription research Agent toolkit. It should prioritize the user's local research workflow while remaining distributable to other users and portable across agent runtimes.

The project should evolve from:

```text
RSS Skills suite
```

into:

```text
Local-first subscription research Agent toolkit
```

The current RSS Skills become the channel/tooling foundation. A new high-level research Skill and Node/TypeScript CLI provide the research workspace, evidence brief workflow, and future distribution path.

## Design Principles

- Local-first: subscriptions, source health, article archive, research runs, and notes default to local files.
- Data-portable: use SQLite, JSONL, JSON, and Markdown before any hosted dependency.
- Evidence-first: tools prepare evidence and context; the Agent writes final analysis from that evidence.
- Agent-runtime neutral: do not bind core behavior to Codex, Claude, Obsidian, n8n, GitHub Actions, or a specific LLM provider.
- npx-ready, not npx-dependent: design a Node CLI suitable for npm distribution, but keep local checkout usage valid.
- Markdown-readable: outputs must be understandable in any editor, not only Obsidian.
- Source-aware: source quality and source reliability influence research evidence.
- Incremental migration: keep the stable Python RSS worker for now; do not rewrite RSS core as part of `v0.3`.

## Non-Goals For v0.3

- No Web UI.
- No cloud sync.
- No vector database.
- No automatic full research report generation.
- No LLM-dependent summarization, reranking, or entity extraction in the core CLI.
- No MCP server, Claude plugin, n8n node, or plugin marketplace package.
- No TypeScript rewrite of the existing RSS parser and scorer.
- No Obsidian-specific default syntax such as wikilinks.

## Target User

The first target user is an individual doing local research work: tracking technical and AI topics, collecting evidence from subscription sources, and asking an Agent to write a memo from a prepared evidence brief.

The design must also remain useful to other users after distribution. A user should be able to install or clone the project, initialize a local workspace, ingest feeds, and produce an evidence brief without needing the original author's local setup.

## Repository Shape

Keep a monorepo until the CLI, workspace schema, and Skill boundaries stabilize:

```text
rss-agent-skills/
├── skills/
│   ├── rss-ai-digest/
│   ├── rss-source-curator/
│   └── subscription-research-agent/
├── packages/
│   └── research-cli/
├── docs/
├── tests/
└── README.md
```

### Existing Skills

`rss-ai-digest` remains responsible for RSS/Atom/OPML ingestion, article scoring, topic assignment, digest generation, and JSON output.

`rss-source-curator` remains responsible for source health, source quality, source curation actions, and reviewed registry patch workflows.

### New Skill

`subscription-research-agent` is a high-level orchestration Skill. It should not parse RSS directly. It should explain how an Agent uses the research workspace and the lower-level RSS Skills to:

- Initialize a local research workspace.
- Ingest subscription channel data.
- Archive normalized articles.
- Generate evidence briefs.
- Maintain entity and topic context.
- Hand evidence to the Agent for memo writing.

## Node/TypeScript CLI

Add a Node/TypeScript package under `packages/research-cli/`.

Package goal:

```text
subscription-research
```

Future npm usage:

```bash
npx @subscription-research/cli init
npx @subscription-research/cli ingest rss
npx @subscription-research/cli brief evidence
```

Local checkout usage:

```bash
node packages/research-cli/dist/cli.js init --workspace ./research-workspace
```

### CLI Responsibilities

- Manage research workspace paths.
- Create and migrate SQLite schema.
- Read and write config files.
- Call the existing Python RSS worker.
- Store normalized articles in SQLite and JSONL.
- Extract known and candidate entities.
- Select evidence items.
- Render evidence brief Markdown and JSON.

### Python Worker Boundary

For `v0.3`, the Node CLI calls the existing Python script through subprocess:

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py digest --format json ...
```

The Python worker remains the source of truth for RSS/Atom/OPML behavior in `v0.3`. Node owns the research workspace and evidence workflow.

## SQLite Strategy

SQLite is the primary local query layer. JSONL remains an append-friendly archive and audit trail. Markdown remains the human-readable research output layer.

Recommended Node dependency for `v0.3`:

```text
better-sqlite3
```

Rationale:

- Synchronous API fits CLI workflows.
- Stable and widely used for local-first tools.
- Simpler than introducing a server or async database layer.

Distribution risk: `better-sqlite3` is a native dependency. If npm/npx installation friction becomes a real issue, reassess `node:sqlite` or a wasm SQLite option in a later phase.

## Research Workspace

Default workspace structure:

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
│   ├── daily/
│   ├── weekly/
│   ├── topics/
│   ├── entities/
│   └── memos/
├── exports/
│   ├── markdown/
│   ├── json/
│   └── opml/
└── config/
    ├── workspace.json
    ├── entities.json
    ├── topics.json
    └── research-rules.json
```

The structure is ordinary files and folders. It should work in any editor. Obsidian compatibility can be added through optional export styles, but Obsidian is not a dependency.

## SQLite Schema

Use a compact schema for `v0.3`.

### `sources`

Stores subscription sources and source reliability context.

Fields:

- `id`
- `title`
- `url`
- `type`
- `language`
- `category_json`
- `base_score`
- `status`
- `reliability_score`
- `last_success_at`
- `last_error_at`
- `created_at`
- `updated_at`

### `articles`

Stores normalized article metadata and archive references.

Fields:

- `id`
- `source_id`
- `title`
- `link`
- `author`
- `published_at`
- `summary`
- `content_excerpt`
- `topic`
- `score`
- `score_reasons_json`
- `raw_json`
- `first_seen_at`
- `last_seen_at`

### `entities`

Stores known entities and rule-discovered candidates.

Fields:

- `id`
- `name`
- `type`
- `aliases_json`
- `confidence`
- `source`
- `status`
- `created_at`
- `updated_at`

Entity `source` values:

- `config`
- `rule`
- `agent`

Entity `status` values:

- `tracked`
- `candidate`
- `ignored`

### `article_entities`

Joins articles to entities.

Fields:

- `article_id`
- `entity_id`
- `match_text`
- `match_source`
- `confidence`

### `topics`

Stores user-defined and system-defined research topics.

Fields:

- `id`
- `name`
- `description`
- `keywords_json`
- `status`
- `created_at`
- `updated_at`

### `article_topics`

Joins articles to topics.

Fields:

- `article_id`
- `topic_id`
- `match_source`
- `confidence`

### `research_runs`

Stores each evidence brief generation run.

Fields:

- `id`
- `question`
- `time_window`
- `criteria_json`
- `started_at`
- `completed_at`
- `output_markdown_path`
- `output_json_path`

### `evidence_items`

Stores selected evidence for a research run.

Fields:

- `run_id`
- `article_id`
- `rank`
- `score`
- `why_selected_json`
- `evidence_type`
- `usefulness`

## Entity Extraction

Use combined known-entity matching and rule-based candidate extraction.

### Known Entities

Configured in:

```text
research-workspace/config/entities.json
```

Example:

```json
{
  "entities": [
    {
      "id": "openai",
      "name": "OpenAI",
      "aliases": ["OpenAI", "ChatGPT", "GPT-5"],
      "type": "company",
      "tags": ["ai", "model-provider"]
    }
  ]
}
```

Matched known entities are high-confidence evidence metadata.

### Candidate Entities

Rule extraction should identify candidate entities from title and summary only. Candidate signals include:

- all-caps technical terms such as `MCP`, `LLM`, `GPU`
- CamelCase or PascalCase names such as `LangGraph`
- model/version strings such as `GPT-5`, `Claude 4`, `Llama 3`
- repository-shaped strings such as `org/repo`
- product/framework suffixes such as `SDK`, `API`, `CLI`, `Agent`, `DB`

Candidate entities should be stored with `status: "candidate"` and should not be treated as confirmed until a user or Agent promotes them.

## Evidence Brief

`v0.3` should generate evidence briefs, not final research memos.

Tool responsibility:

- collect and archive source material
- select evidence items
- attach source, score, topic, entity, and reason metadata
- identify source notes and gaps where deterministic rules can support them
- output Markdown and JSON

Agent responsibility:

- read the evidence brief
- synthesize key signals
- judge gaps and contradictions
- write the final memo or report when the user asks

### Markdown Shape

```markdown
# Evidence Brief: <Research Question>

## Scope
- Question:
- Time window:
- Generated at:
- Sources scanned:
- Evidence items:
- Selection criteria:

## Key Signals
- Agent-fillable from evidence.

## Evidence Items
### 1. <Title>
- Source:
- Link:
- Published:
- Topic:
- Entities:
- Score:
- Why selected:
- Evidence type:
- Usefulness:

## Source Notes
- Strong sources:
- Weak/noisy sources:
- Failed sources:

## Gaps
- Missing perspectives:
- Thin evidence:
- Sources to add:

## Suggested Next Questions
- Agent-fillable from evidence.
```

### JSON Shape

```json
{
  "question": "",
  "time_window": "7d",
  "generated_at": "",
  "sources_scanned": 0,
  "evidence_count": 0,
  "selection_criteria": {
    "must_keywords": [],
    "should_keywords": [],
    "exclude_keywords": [],
    "min_score": 7
  },
  "key_signals": [],
  "evidence_items": [],
  "source_notes": {},
  "gaps": [],
  "suggested_next_questions": []
}
```

`key_signals` and `suggested_next_questions` may be empty in deterministic CLI output. The Agent can fill them during the final research conversation.

## CLI Commands For v0.3

### `init`

Initializes a local research workspace.

```bash
subscription-research init --workspace ./research-workspace
```

Creates:

- workspace folders
- SQLite database
- schema version table
- default config files

### `ingest rss`

Runs RSS ingestion and stores article evidence locally.

```bash
subscription-research ingest rss \
  --workspace ./research-workspace \
  --registry feeds.json \
  --since 7d
```

Behavior:

- calls the Python RSS worker with JSON output
- appends normalized entries to `data/articles.jsonl`
- upserts `sources`
- upserts `articles`
- extracts entities
- links article topics and entities

### `brief evidence`

Generates a research evidence brief.

```bash
subscription-research brief evidence \
  --workspace ./research-workspace \
  --question "最近 LLM evals 有哪些新进展？" \
  --since 7d \
  --must-keywords "llm,evals" \
  --should-keywords "benchmark,reliability,agent"
```

Behavior:

- records a `research_runs` row
- selects relevant articles from SQLite
- creates `evidence_items`
- writes Markdown to `notes/briefs/`
- writes JSON to `exports/json/`

## Skill Boundary For `subscription-research-agent`

The new Skill should be a research orchestrator. It should not duplicate lower-level RSS command documentation.

It should route:

- source ingestion and article discovery to `rss-ai-digest`
- source quality and registry maintenance to `rss-source-curator`
- evidence brief generation to the Node CLI
- final memo writing to the active Agent using the evidence brief

It should state clearly that deterministic CLI output is an evidence package, not a final conclusion.

## Testing Strategy

Add tests at two layers.

### Node CLI Tests

Use a small fixture workspace and fixture RSS JSON output.

Coverage:

- `init` creates required folders and SQLite schema
- schema migration is idempotent
- RSS ingest upserts articles and sources
- known entity matching works
- candidate entity extraction works
- evidence brief JSON contains selected evidence
- evidence brief Markdown is stable and readable

### Existing Python Tests

Keep current `tests/test_rss_monitor.py` passing. The Node CLI should treat the Python RSS JSON contract as an external worker contract.

## Migration And Compatibility

The existing RSS Skills remain valid. `v0.3` adds a higher-level research workflow without breaking `rss-ai-digest` or `rss-source-curator`.

The Python worker remains in place for the first version of the research CLI. If a later release moves RSS core into TypeScript, it should preserve the JSON envelope contract first and only then change implementation.

## Release Strategy

Before starting `v0.3` implementation:

1. Review this design.
2. Release or explicitly defer `v0.2.0`.
3. Write a concrete implementation plan for the Node CLI, workspace schema, and `subscription-research-agent` Skill.

Do not publish an npm package in the first implementation pass. First validate local checkout usage, schema stability, and evidence brief usefulness.

## Success Criteria For v0.3

- A user can initialize a local research workspace.
- RSS entries can be ingested into SQLite and JSONL.
- Known and candidate entities are attached to articles.
- A research question can produce Markdown and JSON evidence briefs.
- The evidence brief gives an Agent enough structured context to write a memo with citations.
- Existing RSS Skills continue to validate and test successfully.
- The project remains local-first and portable.
