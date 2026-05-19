# RSS AI Digest Optimization Design

Date: 2026-05-20

## Purpose

This document turns the subscription daily digest test retrospective into an optimization design for `rss-ai-digest`. It focuses on runtime correctness, observability, performance, scoring quality, and source governance while keeping the Skill portable across agent ecosystems.

Source input:

- `docs/superpowers/specs/2026-05-20-rss-ai-digest-test-retro.md`

## Current Behavior Summary

The MVP works for the happy path:

- OPML import creates a usable feed registry.
- RSS and Atom parsing work.
- Entry filtering, article scoring, Markdown rendering, and seen-state dedupe work.
- The base OPML imports 92 feeds.
- A real full-feed daily digest can produce useful AI and technical results.

The test also exposed important workflow gaps:

- `digest` hides fetch failures because it discards `_health`.
- Full 92-feed fetch is serial and slow.
- `digest` cannot persist health data for later `evaluate-sources`.
- Imported feeds all start with flat metadata: `base_score: 5`, empty `language`, empty `tags`.
- Keyword matching is broad and can over-rank weak AI mentions.
- Seen-state marking is fixed to all filtered entries, which can hide entries that fail the current score threshold.

## Root Cause Analysis

### Hidden failures

`fetch_entries()` already returns `(entries, health)`, but `command_digest()` assigns the second value to `_health` and never renders or persists it. The result is misleading in constrained environments: a network-denied run can look like an empty but successful digest.

### Slow full-feed runs

`fetch_entries()` loops over enabled feeds sequentially. With 92 feeds, total runtime is bounded by the sum of all feed response times. One slow feed can delay the whole report.

### Source evaluation lacks real data

`evaluate_sources()` can score based on `source-health.json`, but the main daily workflow does not write that file. Source quality therefore stays disconnected from the most common command users run.

### Scoring quality is under-informed

`score_entry()` relies on title and summary token matches plus a feed `base_score`, but imported OPML sources all receive the same default metadata. Source prior, source category, and noisy-source tags are not yet doing enough work.

### Keyword matching is too permissive

`filter_entries()` checks raw substring membership in title plus summary. This catches broad AI mentions but does not distinguish title relevance, required terms, exact token matches, or secondary mentions in unrelated commentary.

### Dedupe policy is too rigid

`command_digest()` calls `mark_seen(state, new_entries)`, so every filtered item is marked seen before the score gate is applied. If the user later lowers `--min-score`, previously hidden entries may not appear.

## Optimization Goals

1. Make feed failures visible in every digest run.
2. Persist source health from normal digest and monitoring workflows.
3. Reduce full-feed runtime without sacrificing deterministic output.
4. Improve precision for AI and technical digest results.
5. Make seen-state behavior configurable and explicit.
6. Keep the implementation standard-library-only unless a future design explicitly adds dependencies.
7. Preserve portable Skill packaging and command-line usability.

## Proposed Architecture Changes

### 1. Introduce a digest result envelope

Return a structured result from digest workflows instead of passing around only entries.

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
  }
}
```

Markdown output should render:

- digest title
- ranked entries
- run statistics
- failed feeds section when failures exist

JSON output should return the full envelope.

### 2. Persist source health from digest and check-new

Add optional health persistence:

```bash
rss_monitor.py digest \
  --registry feeds.json \
  --state seen.json \
  --health source-health.json
```

Behavior:

- If `--health` is provided, load previous health before fetching.
- Merge the current fetch result into existing health.
- Preserve failure history instead of replacing it with a single run.
- Store `last_success_at`, `last_error_at`, `failure_count`, `success_count`, `last_item_at`, and optional `last_error`.

The health file remains explicit and user-controlled.

### 3. Add concurrent fetch with deterministic output

Add conservative concurrency:

```bash
rss_monitor.py digest \
  --registry feeds.json \
  --state seen.json \
  --timeout 15 \
  --max-workers 8
```

Implementation direction:

- Use `concurrent.futures.ThreadPoolExecutor` from the standard library.
- Fetch only enabled feeds.
- Keep per-feed timeout support in `fetch_url()`.
- Record each feed result independently.
- Sort final entries deterministically by score descending, published date descending, feed id, and title.
- Sort failures by feed id.

Default values:

- `--timeout 20`
- `--max-workers 8`

For very small registries, serial and concurrent behavior should produce equivalent output.

### 4. Make mark-seen policy explicit

Add:

```bash
--mark-seen reported-only
```

Modes:

- `reported-only`: mark only entries that pass score/filter gates and appear in output. Recommended default for digest.
- `all-filtered`: current behavior; mark every new entry that passed filters before score gating.
- `none`: do not update seen state; useful for dry runs and scoring experiments.

Recommended defaults:

- `digest`: `reported-only`
- `check-new`: `reported-only`

This prevents threshold changes from hiding entries the user never saw.

### 5. Improve keyword matching

Add token-aware matching while preserving simple CSV input.

Rules:

- Exact token match for single-word keywords.
- Case-insensitive phrase match for multi-word keywords.
- Track match field: `title`, `summary`, or both.
- Give title matches higher score impact than summary-only matches.
- Keep substring fallback only for explicit phrase keywords.

Optional future flag:

```bash
--match-mode any
--match-mode all
```

MVP optimization should implement token-aware `any`; `all` can wait unless needed.

### 6. Add curated registry enrichment

The base OPML is useful for source portability, but OPML cannot express rich scoring metadata consistently. Add a registry enrichment reference file or script-driven defaults.

Recommended file:

```text
skills/rss-ai-digest/references/source-metadata.json
```

Example:

```json
{
  "simonwillison-net": {
    "base_score": 9,
    "language": "en",
    "tags": ["must-read", "llm", "engineering"]
  },
  "daringfireball-net": {
    "base_score": 5,
    "language": "en",
    "tags": ["apple", "commentary"]
  }
}
```

Add an optional import flag:

```bash
rss_monitor.py import-opml \
  --opml base-feeds.opml \
  --registry feeds.json \
  --metadata source-metadata.json
```

This keeps OPML interoperable while allowing the project to maintain better source priors.

### 7. Improve source evaluation semantics

Update source health scoring to distinguish:

- no health yet
- recently healthy
- repeatedly failing
- stale source
- high-quality source
- noisy source

Add fields:

- `status`: `unknown`, `healthy`, `degraded`, `failing`, `stale`
- `recommendation_reason`: short human-readable reason
- `last_error`: last error text, truncated for readability

When no health exists, the recommendation should not imply low quality. Prefer:

```json
{
  "status": "unknown",
  "recommendation": "watch"
}
```

instead of defaulting all feeds to `lower-priority`.

## User-Facing Workflow After Optimization

### Daily digest

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py digest \
  --registry feeds.json \
  --state seen.json \
  --health source-health.json \
  --since 24h \
  --keywords "agent,llm,rag,evals,inference" \
  --min-score 7 \
  --mark-seen reported-only \
  --max-workers 8 \
  --timeout 15 \
  --format markdown
```

Expected output:

- Ranked entries.
- Stats summary.
- Failed feeds section if any source failed.
- Clear note when no entries matched but feed failures occurred.

### Source governance

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py evaluate-sources \
  --registry feeds.json \
  --health source-health.json
```

Expected output:

- Source score.
- Status.
- Recommendation.
- Recommendation reason.
- Failure count and last error when relevant.

## Implementation Phases

### Phase 1: Observability and correctness

Scope:

- Add digest result envelope.
- Render failed feeds in Markdown.
- Return full envelope in JSON.
- Add `--health` to `digest` and `check-new`.
- Merge and persist source health.
- Add `--mark-seen` with `reported-only`, `all-filtered`, and `none`.

Tests:

- Digest JSON includes `entries`, `health`, `failures`, and `stats`.
- Markdown digest includes a failed-feeds section when fetch failures exist.
- A network-denied or mocked failed feed is visible instead of producing only "No matching entries found."
- `--health` writes a health file.
- `reported-only` marks only output entries.
- `all-filtered` preserves current behavior.
- `none` does not update seen state.

Acceptance criteria:

- Empty digest output is never ambiguous when feed failures occurred.
- `evaluate-sources` can use health produced by a prior digest.
- Existing tests still pass.

### Phase 2: Performance

Scope:

- Add `--timeout` and `--max-workers`.
- Implement concurrent feed fetching.
- Preserve deterministic final ordering.

Tests:

- Concurrent fetch returns the same logical entries as serial fetch for controlled fixtures.
- Per-feed failures are isolated and do not abort the whole run.
- Output ordering is deterministic across repeated runs.

Acceptance criteria:

- Full 92-feed runs are materially faster than serial fetch under normal network conditions.
- One slow or failing feed does not block the entire digest beyond timeout.

### Phase 3: Scoring precision

Scope:

- Add token-aware keyword matching.
- Track match locations.
- Adjust scoring to reward title matches and penalize weak summary-only matches.
- Add source metadata enrichment support.

Tests:

- `ai` does not match unrelated substrings.
- Multi-word phrase keywords still work.
- Title matches receive stronger ranking than summary-only matches.
- Metadata enrichment updates `base_score`, `language`, and `tags` during import.

Acceptance criteria:

- Daily digest has fewer weak AI-adjacent items.
- High-signal trusted sources rank reliably without hardcoding one runtime or account.

### Phase 4: Source governance

Scope:

- Improve `evaluate_sources()` status and recommendation semantics.
- Add `recommendation_reason`.
- Treat missing health as `unknown`, not inherently low quality.
- Update references and README examples.

Tests:

- No-health sources return `status: unknown` and `recommendation: watch`.
- Repeated failures return `status: failing` and `recommendation: remove` or `lower-priority`.
- Healthy high-quality sources return `keep`.

Acceptance criteria:

- Source evaluation is useful immediately after import and becomes more accurate after scheduled runs.

## Data Contract Changes

### Health record

```json
{
  "feed-id": {
    "status": "healthy",
    "success_count": 3,
    "failure_count": 0,
    "last_success_at": "2026-05-20T09:00:00+00:00",
    "last_error_at": "",
    "last_error": "",
    "last_item_at": "2026-05-20T08:30:00+00:00",
    "quality_avg": 8.2
  }
}
```

### Digest JSON envelope

```json
{
  "entries": [],
  "failures": [],
  "health": {},
  "stats": {},
  "generated_at": "2026-05-20T09:00:00+00:00"
}
```

## Documentation Updates Required

- Update `SKILL.md` command examples for `--health`, `--timeout`, `--max-workers`, and `--mark-seen`.
- Update `references/feed-registry.md` with the expanded health schema.
- Update `references/scoring.md` with keyword matching and source metadata guidance.
- Add `references/source-metadata.json` if metadata enrichment is implemented.
- Update `README.md` quick start once CLI flags change.
- Update `CHANGELOG.md` for each delivered optimization phase.

## Risks And Mitigations

- Risk: concurrency makes tests flaky.
  - Mitigation: keep deterministic sorting and test with controlled fake fetch functions.
- Risk: richer JSON output breaks existing automation expecting a list.
  - Mitigation: keep `fetch` unchanged; document that `digest --format json` now returns an envelope, or add `--json-shape list|envelope` if backward compatibility becomes necessary.
- Risk: source metadata duplicates feed registry fields.
  - Mitigation: treat metadata as import-time enrichment, not a second runtime registry.
- Risk: scoring becomes too complex for a portable Skill.
  - Mitigation: keep heuristics deterministic, explain score reasons, and avoid LLM-only scoring in the core CLI.

## Recommended Next Step

Implement Phase 1 first. It fixes correctness and trust issues without changing the network model or ranking heuristics. After Phase 1, rerun the daily digest test and compare:

- failure visibility
- health persistence
- seen-state behavior
- JSON envelope shape

Only then move to concurrency and scoring quality.
