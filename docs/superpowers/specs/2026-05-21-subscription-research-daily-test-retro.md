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

Next:

- Add a `daily-report.md` reference or template under `skills/subscription-research-agent/references/`.
- Include sections for key signals, recommended reading order, source reliability, and workflow notes.

### Original Source Attribution

Daring Fireball and similar sources often link to original reporting while adding commentary.

Next:

- Add fields for `source`, `commentary_source`, and `original_source` when they can be detected.
- Avoid treating a secondary commentary feed as the only source for major announcements.

### Research Run Persistence

The workspace has `research_runs`, but ingest run metadata does not yet persist fetched feed count, failed feed count, archived entry count, and command criteria in a first-class table row.

Next:

- Add an ingest run record or extend `research_runs` to cover ingestion.
- Store RSS digest stats and health summary with each ingest.

### Source Governance Follow-up

The daily run produced 15 source failures. It is not enough evidence to remove feeds.

Next:

- Track repeated failures across multiple days.
- Recommend retry/timeout tuning for high-value sources before recommending removal.
- Feed this data into `rss-source-curator`.

## Regression Status

Implemented in the follow-up regression pass:

- `source_health_summary` in evidence brief JSON and Markdown.
- `sources_scanned` fallback to health entry count.
- Entity candidate noise filters.
- Node tests for health summary, since filtering, file collision prevention, worker path resolution, and entity candidate filtering.
- Python tests updated so command-level digest behavior is not tied to a fixed `24h` wall-clock window.

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
