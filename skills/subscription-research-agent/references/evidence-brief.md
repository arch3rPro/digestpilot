# Evidence Brief

An evidence brief is not the final research memo. It is a source-backed context package for an Agent.

## Required Sections

- Scope
- Key Signals
- Evidence Items
- Source Notes
- Gaps
- Suggested Next Questions

## Evidence Item Fields

Each evidence item should include:

- `title`
- `source`
- `link`
- `published_at`
- `topic`
- `entities`
- `score`
- `why_selected`
- `evidence_type`
- `usefulness`

## Agent Responsibilities

The deterministic CLI may leave `Key Signals` and `Suggested Next Questions` as agent-fillable sections. The Agent should fill them after reading the evidence, preserve citations to source items, and separate evidence-backed claims from open questions.

When writing a memo from the brief:

- Cite the strongest evidence items directly.
- Call out stale, missing, or weak evidence.
- Avoid treating score as truth; use it as a ranking signal.
- Keep speculation separate from the evidence summary.
- For daily reports, follow `daily-report.md` after the evidence brief is generated or reviewed.
