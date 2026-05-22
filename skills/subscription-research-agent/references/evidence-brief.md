# Evidence Brief

An evidence brief is not the final research memo. It is a source-backed context package for an Agent.

## Required Sections

- Scope
- Key Signals
- Daily Report Guidance
- Evidence Items
- Source Notes
- Gaps
- Suggested Next Questions

## Evidence Item Fields

Each evidence item should include:

- `title`
- `source`
- `summary`
- `commentary_source`
- `original_source`
- `original_url`
- `link`
- `published_at`
- `topic`
- `entities`
- `score`
- `why_selected`
- `evidence_type`
- `usefulness`
- `priority_bucket`
- `attribution_label`
- `merge_key`
- `low_confidence`

## Daily Report Guidance Fields

When the brief is used for a research daily or memo, it should include:

- `priority_buckets`: lead, supporting, and watch candidate titles.
- `merge_hints`: repeated release notes, reposts, or same-event commentary that should be merged before writing.
- `style_notes`: writing rules for the final report.
- `quality_checklist`: readiness checks for source coverage, attribution, duplicate merging, noise filtering, Chinese readability, and follow-up quality.

Selection criteria should record whether `must_keywords` were interpreted as `any` or `all`. Broad research-daily workflows should usually use `any` so a broad AI topic list does not require every term to appear in the same article. Use `all` only for narrow research questions such as `llm,evals`.

## Agent Responsibilities

The deterministic CLI may leave `Key Signals` and `Suggested Next Questions` as agent-fillable sections. The Agent should fill them after reading the evidence, preserve citations to source items, and separate evidence-backed claims from open questions.

When writing a memo from the brief:

- Cite the strongest evidence items directly.
- Call out stale, missing, or weak evidence.
- Avoid treating score as truth; use it as a ranking signal.
- Keep speculation separate from the evidence summary.
- For research dailies or memos, follow `daily-report.md` after the evidence brief is generated or reviewed.
- Before delivering a research daily or memo, apply `daily-report-quality.md`.
