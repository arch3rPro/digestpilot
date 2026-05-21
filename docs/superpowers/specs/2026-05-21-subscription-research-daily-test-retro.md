# 2026-05-21 Subscription Research Daily Test Retro

## Context

This retro records the first real local research workflow test after the `v0.3` subscription research foundation was merged.

The goal was to validate the end-to-end path:

```text
base OPML -> RSS registry -> research workspace -> RSS ingest -> SQLite/JSONL archive -> evidence brief -> Chinese research daily
```

## Test Run

- Date: 2026-05-21
- Workspace: `research-workspace/daily-2026-05-21/`
- Source seed: `skills/rss-ai-digest/references/base-feeds.opml`
- Registry size: 92 feeds
- Time window: 24h
- Archived evidence items: 10
- Entity links created: 103 before cleanup filtering was added
- Topic distribution:
  - `AI / LLM`: 7
  - `Engineering`: 3
- Generated daily report:
  - `research-workspace/daily-2026-05-21/notes/daily/2026-05-21-research-daily.zh-CN.md`
- Generated evidence brief:
  - `research-workspace/daily-2026-05-21/notes/briefs/2026-05-21-24-ai-c69a4641.md`

## Findings

### Workflow Validated

The full local-first workflow is operational. The CLI initialized a workspace, ingested real RSS evidence into SQLite and JSONL, generated a Markdown/JSON evidence brief, and supported an Agent-written Chinese research daily.

This validates the core project direction: deterministic local tools can prepare a useful evidence package, while the active Agent remains responsible for synthesis and memo writing.

### Strong Content Signals

The strongest signals in the test run clustered around:

- Google I/O, Gemini Spark, Antigravity, and hosted personal agents.
- Agent security boundaries such as isolated runtimes, DLP, credentials, and prompt-injection risk.
- AI infrastructure commercialization through large compute capacity agreements.
- Model UX metrics such as tokens per second.
- Engineering methodology around assumptions, formal properties, and test strength.

### Source Reliability

The run checked 92 feeds. 77 had successful fetch records and 15 had failure records.

Failure modes included:

- SSL handshake timeouts.
- HTTP 503.
- HTTP 530.
- Invalid XML content.

This confirms that source governance should distinguish temporary network failures from persistent bad feeds before making curation decisions.

## Issues Found

### 1. Evidence Brief Source Count Was Misleading

`sources_scanned` was derived from the SQLite `sources` table. That table only contained sources with archived entries, not all feeds checked by the RSS worker.

Impact: the evidence brief could claim `sources_scanned: 6` even when 92 feeds were checked.

Regression action:

- Read `data/source-health.json` when generating an evidence brief.
- Use health entry count as `sources_scanned` when available.
- Add `source_health_summary` to the JSON and Markdown evidence brief.
- Add regression coverage for health summary rendering.
- Treat `failure_count > 0` or `status: failing` as failure; do not treat empty historical error fields as current failures.

### 2. Entity Extraction Was Too Noisy

The first run extracted URL path fragments, date-like strings, and all-caps incidental tokens as candidate entities.

Examples included:

- `net/tags`
- `com/google-gemini`
- `May/19`
- numeric or date-like fragments

Impact: evidence items became harder to scan and entity graphs would accumulate low-value nodes.

Regression action:

- Filter candidate entities containing `/`.
- Filter candidates beginning with digits.
- Filter date-like month fragments and long all-caps noise.
- Add regression coverage for URL/date candidate filtering.

### 3. Source Failure Details Were Not Prominent In Briefs

The deterministic evidence brief had empty source-note placeholders even when source failures existed.

Impact: an Agent writing a research memo had to inspect separate health files to understand source coverage gaps.

Regression action:

- Add source success/failure counts to the `Scope` section.
- Add failed source samples under `Source Notes`.
- Preserve structured failure samples in JSON.

## Remaining Optimization Backlog

### Daily Report Template

The Agent can write a good report from evidence, but the shape is still manual.

Status: implemented as an Agent-facing report contract.

Implemented:

- Added `skills/subscription-research-agent/references/daily-report.md`.
- Added stable sections for run overview, key judgments, top items, reading order, source health, and follow-up questions.
- Kept final daily report writing as Agent synthesis, not deterministic CLI output.

### Original Source Attribution

Daring Fireball and similar sources often link to original reporting while adding commentary.

Status: implemented for conservative RSS metadata attribution.

Implemented:

- Added article attribution fields for `commentary_source`, `original_source`, and `original_url`.
- Detects conservative title patterns such as `WSJ: ...` and `Quoting SpaceX S-1`.
- Evidence brief JSON and Markdown now expose original and commentary source fields.
- Normal articles without explicit source hints keep attribution fields empty rather than guessing.

Remaining:

- Full-page original URL extraction.
- Broader source-pattern registry.
- LLM-assisted attribution review for ambiguous cases.

### Research Run Persistence

Status: implemented in the follow-up persistence pass.

The workspace now persists RSS ingest metadata in `research_runs` with:

- `run_type = rss_ingest`
- command criteria such as channel, registry, time window, keyword criteria, and score threshold
- RSS digest stats such as feed counts and failures
- source health summary with failed source samples
- archived entry count
- entity link count

This keeps evidence brief generation and daily report writing connected to the ingest run that prepared the local evidence.

### Source Governance Follow-up

Status: implemented for historical observation and recommendation summaries.

Implemented:

- RSS ingest now persists per-source observations in `source_health_observations`.
- `subscription-research source-health` summarizes repeated observations.
- Recommendations distinguish `keep`, `watch`, and `disable_candidate`.
- `rss-source-curator` now documents these historical observations as review signals.

Remaining:

- Automatically generating reviewed registry patches from historical source-health summaries.
- Incorporating source value and retry/timeout tuning into recommendations.

## Regression Status

Implemented in the follow-up regression pass:

- `source_health_summary` in evidence brief JSON and Markdown.
- `sources_scanned` fallback to health entry count.
- Entity candidate noise filters.
- Node tests for health summary, since filtering, file collision prevention, worker path resolution, and entity candidate filtering.
- Python tests updated so command-level digest behavior is not tied to a fixed `24h` wall-clock window.

Implemented in the follow-up persistence pass:

- RSS ingest runs persisted to `research_runs`.
- Schema version advanced to 2 with lightweight migration for existing workspaces.
- Node tests added for persisted ingest criteria, source health summary, archive count, and entity link count.

Implemented in the follow-up attribution pass:

- Schema version advanced to 3 with article attribution columns and migration coverage.
- Conservative attribution inference added for common commentary title patterns.
- Evidence brief output includes original and commentary source attribution.
- Node tests added for attribution persistence and evidence rendering.

Implemented in the follow-up source-health history pass:

- Schema version advanced to 4 with `source_health_observations`.
- RSS ingest persists per-source health snapshots for each run.
- Added `subscription-research source-health` JSON/Markdown summaries.
- Node tests added for persistent, intermittent, and healthy source recommendations.

Real workspace regression check after the fix:

```json
{
  "sources_scanned": 92,
  "source_health_summary": {
    "checked": 92,
    "succeeded": 77,
    "failed": 15
  },
  "evidence_count": 10
}
```

Verification commands:

```bash
cd packages/research-cli && npm test
cd packages/research-cli && npm run typecheck
python3 -m unittest tests/test_rss_monitor.py -v
git diff --check
```

All passed after the regression changes.
