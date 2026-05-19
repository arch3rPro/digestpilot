# Change Log

All notable project changes are recorded here. This repository follows a practical change log format rather than a formal release-versioning scheme until packaged releases begin.

## 2026-05-20

### Added

- Implemented Phase 1 observability for `rss-ai-digest`:
  - `digest` and `check-new` can persist source health with `--health`.
  - `digest --format json` now returns an envelope with `entries`, `failures`, `health`, `stats`, and `generated_at`.
  - Markdown digests include run stats and failed feed reporting.
  - Seen-state updates are configurable with `--mark-seen reported-only`, `--mark-seen all-filtered`, or `--mark-seen none`.

### Changed

- Default digest/check-new seen-state behavior now marks only reported entries, so low-scoring filtered items are not hidden before the user sees them.

### Validation

- `python3 -m unittest tests/test_rss_monitor.py -v`

## 2026-05-20 Optimization Design

### Added

- Added `docs/superpowers/specs/2026-05-20-rss-ai-digest-optimization-design.md`, a detailed optimization design based on the daily digest test retrospective.

### Documentation

- Added README navigation for the optimization design.

## 2026-05-20 Agent Instructions

### Added

- Added `AGENTS.md` as the shared coding-agent instruction file for repository layout, development commands, coding conventions, documentation rules, testing expectations, security guidance, and Git workflow.
- Added `CLAUDE.md` for Claude Code, importing `AGENTS.md` and keeping Claude-specific guidance short.
- Added `CLAUDE.local.md` to `.gitignore` for private local Claude Code preferences.

### Documentation

- Added README links for agent instruction files.

## 2026-05-20 Initial Repository Setup

### Added

- Initialized `rss-agent-skills` as a portable RSS Skill repository for general Agent ecosystems.
- Added the first Skill: `skills/rss-ai-digest`.
- Added `rss-ai-digest` Skill metadata, workflow instructions, and OpenAI/Codex UI metadata.
- Added `scripts/rss_monitor.py` with support for:
  - OPML import
  - RSS 2.0 parsing
  - Atom parsing
  - keyword, author, date, category, and language filtering
  - seen-state deduplication
  - deterministic article scoring
  - source quality evaluation
  - Markdown and JSON output
- Added `base-feeds.opml` as the curated starter OPML with 92 AI, engineering, security, product, and general technical sources.
- Added reference documentation for feed registry structure, scoring, and automation recipes.
- Added design and implementation planning documents under `docs/superpowers/`.
- Added regression tests for the RSS monitor script.

### Changed

- Preserved OPML parent outline groups as registry `category` values during import.
- Replaced the minimal example OPML with the curated base OPML.

### Validation

- `python3 -m unittest tests/test_rss_monitor.py -v`
- `quick_validate.py skills/rss-ai-digest`

## Repository Notes

- GitHub repository: `arch3rPro/rss-agent-skills`
- Current visibility: private
- Default branch: `main`
