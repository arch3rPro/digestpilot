# Change Log

All notable project changes are recorded here.

## v0.3.0 - Unreleased

### Added

- Added the `subscription-research-agent` Skill for local-first evidence research workflows.
- Added a Chinese implemented-features summary and iteration roadmap for the RSS Agent Skills suite.
- Added `v0.3.0` release notes and aligned the release target with the local-first research Agent scope.
- Added research workspace and evidence brief references for subscription-backed research orchestration.
- Added a daily research report contract for Agent-written reports synthesized from evidence briefs.
- Added SQLite persistence for RSS ingest runs, including criteria, RSS worker stats, source health summary, archived entries, and entity link counts.
- Added conservative article source attribution for commentary and original sources in the research CLI archive and evidence brief output.
- Added per-source health observation history and `subscription-research source-health` summaries for repeated source failure review.
- Added `subscription-research source-health --format patch` to generate reviewable registry patch envelopes from repeated source-health observations.
- Added a Node/TypeScript RSS runtime for RSS 2.0, Atom, filtering, scoring, seen-state dedupe, source health, and digest envelope generation.
- Added compact RSS/Atom parity fixtures to keep Node parser output aligned with the Python compatibility worker.
- Added npm packaging metadata and package-level README for the `subscription-research` CLI.
- Added direct Node RSS registry commands under `subscription-research rss`: `import-opml`, `fetch`, `digest`, `check-new`, `evaluate-sources`, `curate-sources`, and `apply-source-patch`.
- Added `--max-workers` concurrency control to Node RSS fetch, digest, and check-new workflows.
- Improved evidence brief quality with cleaned summaries, configurable must-keyword matching, quieter source-health daily report guidance, and safer source-health disable thresholds.
- Added the `packages/research-cli` Node/TypeScript CLI package for local workspace initialization, SQLite-backed evidence archive, RSS evidence ingest, entity extraction, and evidence brief generation.
- Added public documentation for the v0.3 local-first subscription research Agent direction.

### Changed

- Expanded the project direction from an RSS Skills suite toward a local-first subscription research Agent toolkit.
- Carried the prepared `v0.2.0` RSS Skills suite scope forward into the `v0.3.0` release target.
- Made the research workspace daily-report path explicit in the TypeScript workspace contract.
- Advanced the research workspace schema to version 2 with migration support for RSS ingest run metadata.
- Advanced the research workspace schema to version 3 with migration support for article attribution metadata.
- Advanced the research workspace schema to version 4 with per-source health observation history.
- Made `subscription-research ingest rss` default to the Node RSS runtime while preserving `--rss-runtime python` for compatibility checks.
- Updated Skill guidance to prefer `subscription-research rss ...` over direct Python worker commands for RSS workflows.
- Updated source-curator and automation references to use Node RSS commands for current workflows.

## v0.2.0 - Unreleased

### Added

- Added `rss-source-curator` as the source governance Skill.
- Added deterministic digest presets for research, engineering, security, and product/technology workflows.
- Added must / should / exclude keyword groups.
- Added deterministic topic assignment and grouped Markdown digest output.

### Changed

- Presented the repository as an RSS Skills suite.
- Kept existing digest command behavior backward compatible while adding new digest quality controls.

## v0.1.0 - 2026-05-21

### Added

- Published the first stable checkpoint for `rss-agent-skills` before future multi-Skill splits.
- Stabilized the initial `rss-ai-digest` package contract under `skills/rss-ai-digest/`.
- Added release notes at `docs/releases/v0.1.0.md`.
- Added `VERSION` with `0.1.0`.

### Included

- OPML import, RSS 2.0 parsing, Atom parsing, filtering, scoring, dedupe, and source quality evaluation.
- Curated AI, engineering, security, product, and general technical starter OPML.
- Source health tracking, failed-feed reporting, source curation, and safe source patch application.
- English and Chinese README files, examples, contribution guidance, release checklist, and MIT license.

## 2026-05-21

### Added

- Added `curate-sources` to generate reviewable source governance actions and registry patch hints without modifying feed registries.
- Added `apply-source-patch` to dry-run or apply reviewed source governance patches into an explicit output registry.
- Expanded `source-metadata.json` coverage for selected AI, engineering, security, and commentary sources.

### Documentation

- Documented the release-before-splitting gate for future multi-Skill packaging.
- Reworked README around Agent and Skill usage, with CLI commands reduced to a concise implementation contract and documentation links grouped by purpose.
- Added README sections for project status, installation model, output contract, and data/privacy expectations.
- Added `README.zh-CN.md` for Chinese readers.
- Added `examples/README.md` with common Agent and Skill invocation scenarios.
- Added `CONTRIBUTING.md` and `LICENSE` for a more complete open-source project surface.
- Added a release checklist for the first stable checkpoint and future multi-Skill split.

## 2026-05-20

### Added

- Added stricter content-quality filters for `digest` and `check-new`:
  - `--preset ai-strict` applies default AI keywords, noise exclusions, and title-keyword matching.
  - `--require-any-title-keyword` filters out summary-only keyword matches.
  - `--exclude-keywords` removes entries matching noise keywords or phrases.
  - `--keyword-mode all` requires every included keyword to match.
- Completed the remaining RSS AI Digest optimization phases:
  - Fetch-based commands now support `--timeout` and `--max-workers` with deterministic output ordering after concurrent fetches.
  - Keyword filtering is token-aware for single words and phrase-aware for multi-word terms.
  - Filtered entries now include `matched_keywords` and `matched_keyword_locations`.
  - `import-opml` can apply curated source priors with `--metadata`.
  - Added `skills/rss-ai-digest/references/source-metadata.json` as starter metadata for selected base feeds.
  - `evaluate-sources` now reports `status`, `success_count`, `recommendation_reason`, and `last_error`.
- Implemented Phase 1 observability for `rss-ai-digest`:
  - `digest` and `check-new` can persist source health with `--health`.
  - `digest --format json` now returns an envelope with `entries`, `failures`, `health`, `stats`, and `generated_at`.
  - Markdown digests include run stats and failed feed reporting.
  - Seen-state updates are configurable with `--mark-seen reported-only`, `--mark-seen all-filtered`, or `--mark-seen none`.

### Changed

- Article ranking now rewards title keyword matches and lightly penalizes summary-only matches.
- Missing source health is treated as `unknown/watch` instead of being collapsed into low quality.
- Default digest/check-new seen-state behavior now marks only reported entries, so low-scoring filtered items are not hidden before the user sees them.

### Documentation

- Added `docs/project-status.zh-CN.md` summarizing implemented capabilities, missing features, maturity, and recommended next steps.
- Added `docs/superpowers/plans/2026-05-20-rss-ai-digest-remaining-optimizations.md`.
- Added `docs/superpowers/specs/2026-05-20-rss-ai-digest-post-optimization-validation.md` with full-feed runtime, health, and ranking validation notes.
- Updated README and Skill references for source metadata, fetch controls, keyword matching, and source governance fields.
- Removed the stale public-doc reference to the local test retrospective file.

### Validation

- `python3 -m unittest tests/test_rss_monitor.py -v`
- `quick_validate.py skills/rss-ai-digest`
- `git diff --check`

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
- Current visibility: public
- Default branch: `main`
