# Change Log

All notable project changes are recorded here.

## Unreleased

### Added

- Added optional full-text article enrichment with `subscription-research content fetch`, `article_content` SQLite storage, local `data/content-cache/`, and readability extraction via `@mozilla/readability` and `jsdom`.
- Added RSS feed discovery with `subscription-research rss discover --url ...` and `--input ...` for RSS/Atom alternate link detection, optional feed validation, URL/Markdown candidate lists, and reviewable registry patch candidates that can be applied through `apply-source-patch`.
- Added the first `public-trend-radar` Skill and CLI slice with profile-aware trend cards from public URL lists, Hacker News item JSON, and GitHub release JSON.
- Added `subscription-research trend fetch-public` for real public-channel input collection, `trend scan --output` for direct artifact writing, multi-repo GitHub release payload support, and safer web URL source labels in trend-card JSON.

### Changed

- Renamed the public product positioning to `DigestPilot` while keeping Skill directory names and the `subscription-research` CLI stable.
- Reframed README files around Agent routing and Skill workflow contracts instead of developer-first CLI usage.
- Updated README files with the real public trend workflow: fetch public inputs first, then scan them into Markdown or JSON trend-card artifacts.
- Clarified Skill boundaries: `rss-ai-digest` owns quick daily news and key information, `rss-source-curator` owns source maintenance, and `subscription-research-agent` owns deep research synthesis.
- Archived the current implemented Skills, remaining gaps, and optimization priorities in the Chinese roadmap and status documents.
- Shifted the near-term roadmap priority to a public-channel trend radar with separate AI/technical and product/business profiles.
- Evidence briefs now prefer enriched full-text excerpts when available and fall back to RSS summaries otherwise.
- Recorded the next `rss-ai-digest` priority: archive-first daily digest queries so ordinary daily reports do not require repeated full-feed fetches.
- Improved evidence brief output for Agent-written daily reports with source diversification, daily-report priority buckets, duplicate story merge hints, attribution labels, and low-confidence markers.
- Added a structured daily-report quality checklist to evidence brief output and `subscription-research-agent` references.
- Refined `subscription-research source-health` recommendations with `lower_priority`, consecutive failure counts, recent success/failure timestamps, and maintenance priority.
- Updated source governance and research workspace references for the expanded source-health history fields.
- Added a P1 real RSS daily-report regression record covering three real local runs and updated daily report guidance to keep source maintenance details out of report bodies.

## v0.3.0 - 2026-05-22

### Added

- Added the `subscription-research-agent` Skill for local-first evidence research workflows.
- Added a Chinese implemented-features summary and iteration roadmap for the RSS Agent Skills suite.
- Added `v0.3.0` release notes and aligned the release with the local-first research Agent scope.
- Added research workspace and evidence brief references for subscription-backed research orchestration.
- Added a daily research report contract for Agent-written reports synthesized from evidence briefs.
- Added SQLite persistence for RSS ingest runs, including criteria, RSS worker stats, source health summary, archived entries, and entity link counts.
- Added conservative article source attribution for commentary and original sources in the research CLI archive and evidence brief output.
- Added per-source health observation history and `subscription-research source-health` summaries for repeated source failure review.
- Added `subscription-research source-health --format patch` to generate reviewable registry patch envelopes from repeated source-health observations.
- Added a Node/TypeScript RSS runtime for RSS 2.0, Atom, filtering, scoring, seen-state dedupe, source health, and digest envelope generation.
- Added compact RSS/Atom parser snapshot fixtures for Node runtime regression coverage.
- Added npm packaging metadata and package-level README for the `subscription-research` CLI.
- Added direct Node RSS registry commands under `subscription-research rss`: `import-opml`, `fetch`, `digest`, `check-new`, `evaluate-sources`, `curate-sources`, and `apply-source-patch`.
- Added `--max-workers` concurrency control to Node RSS fetch, digest, and check-new workflows.
- Improved evidence brief quality with cleaned summaries, configurable must-keyword matching, quieter source-health daily report guidance, and safer source-health disable thresholds.
- Added the `packages/research-cli` Node/TypeScript CLI package for local workspace initialization, SQLite-backed evidence archive, RSS evidence ingest, entity extraction, and evidence brief generation.
- Added public documentation for the v0.3 local-first subscription research Agent direction.

### Changed

- Expanded the project direction from an RSS Skills suite toward a local-first subscription research Agent toolkit.
- Carried the prepared `v0.2.0` RSS Skills suite scope forward into the `v0.3.0` release.
- Made the research workspace daily-report path explicit in the TypeScript workspace contract.
- Advanced the research workspace schema to version 2 with migration support for RSS ingest run metadata.
- Advanced the research workspace schema to version 3 with migration support for article attribution metadata.
- Advanced the research workspace schema to version 4 with per-source health observation history.
- Made the Node/TypeScript RSS runtime the single current RSS command implementation.
- Updated Skill guidance to use `subscription-research rss ...` for RSS workflows.
- Updated source-curator and automation references to use Node RSS commands for current workflows.

### Removed

- Removed the legacy Python RSS worker and its CLI compatibility path.
- Removed `--rss-runtime python`, `--script-path`, and `--python` ingest options.
- Removed Python RSS monitor unit tests after moving parser and command coverage to Node tests.

## v0.2.0 - Folded into v0.3.0

This checkpoint was not released as a separate tag. Its scope was carried forward into `v0.3.0`.

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
- Added private planning notes for remaining RSS digest optimizations.
- Added private post-optimization validation notes with full-feed runtime, health, and ranking validation findings.
- Updated README and Skill references for source metadata, fetch controls, keyword matching, and source governance fields.
- Removed the stale public-doc reference to the local test retrospective file.

### Validation

- `python3 -m unittest tests/test_rss_monitor.py -v`
- `quick_validate.py skills/rss-ai-digest`
- `git diff --check`

## 2026-05-20 Optimization Design

### Added

- Added a private optimization design based on the daily digest test retrospective.

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
- Added private design and implementation planning documents.
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
