# RSS AI Digest Phase 1 Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 1 of the RSS AI Digest optimization design: visible feed failures, digest JSON envelopes, health persistence, and configurable seen-state marking.

**Architecture:** Keep the single-file standard-library CLI. Preserve existing parser and scoring behavior while wrapping digest/check-new results in a structured envelope and adding small helpers for stats, failures, health merging, and mark-seen policy.

**Tech Stack:** Python 3 standard library, `argparse`, `json`, `unittest`, existing `rss_monitor.py`.

---

## File Structure

- Modify `skills/rss-ai-digest/scripts/rss_monitor.py`: add digest envelope helpers, health persistence, markdown failure rendering, and `--mark-seen` / `--health` CLI options.
- Modify `tests/test_rss_monitor.py`: add tests for envelope JSON, failure visibility, health persistence, and mark-seen modes.
- Modify `skills/rss-ai-digest/SKILL.md`: update command examples with `--health` and `--mark-seen`.
- Modify `skills/rss-ai-digest/references/feed-registry.md`: document expanded health fields.
- Modify `README.md`: update quick-start digest command.
- Modify `CHANGELOG.md`: record Phase 1 implementation.

### Task 1: Add Failing Tests

**Files:**
- Modify: `tests/test_rss_monitor.py`

- [ ] Add a test that monkeypatches `fetch_entries()` to return one good entry and one failed feed, then calls `command_digest()` with `--format json` semantics and asserts the output envelope includes `entries`, `failures`, `health`, `stats`, and `generated_at`.
- [ ] Add a test that supplies a health path and asserts current fetch health is merged and saved with `success_count`, `failure_count`, `last_success_at`, and `last_error`.
- [ ] Add a test that verifies `mark_seen_policy="reported-only"` marks only entries that pass `min_score`.
- [ ] Add a test that verifies `mark_seen_policy="none"` leaves the seen state empty.
- [ ] Add a test that renders Markdown with failures and asserts a `Failed feeds` section appears.
- [ ] Run `python3 -m unittest tests/test_rss_monitor.py -v` and confirm the new tests fail because Phase 1 helpers and args do not exist yet.

### Task 2: Implement Digest Envelope And Health Persistence

**Files:**
- Modify: `skills/rss-ai-digest/scripts/rss_monitor.py`

- [ ] Add helpers:
  - `build_failures(health, registry)`
  - `build_stats(registry, entries, filtered, reported, marked, health)`
  - `merge_health(previous, current)`
  - `build_digest_result(entries, failures, health, stats)`
  - `select_entries_to_mark(new_entries, scored_entries, policy)`
- [ ] Update `command_digest()` so it uses current health instead of discarding `_health`.
- [ ] Add `--health` and `--mark-seen` to digest/check-new arguments.
- [ ] Persist merged health when `--health` is provided.
- [ ] Return a JSON envelope for `--format json`.
- [ ] Render Markdown with stats and failed feeds for `--format markdown`.
- [ ] Run `python3 -m unittest tests/test_rss_monitor.py -v` and confirm tests pass.

### Task 3: Update Documentation

**Files:**
- Modify: `skills/rss-ai-digest/SKILL.md`
- Modify: `skills/rss-ai-digest/references/feed-registry.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] Update digest examples to include `--health source-health.json` and `--mark-seen reported-only`.
- [ ] Document the digest JSON envelope and failed-feed Markdown behavior.
- [ ] Document expanded health fields.
- [ ] Record the Phase 1 optimization in `CHANGELOG.md`.
- [ ] Run a public-doc scan for local absolute paths, placeholders, and stale names across `AGENTS.md`, `CLAUDE.md`, `.gitignore`, `README.md`, `CHANGELOG.md`, `skills`, `docs/superpowers/plans`, selected specs, and `tests`.

### Task 4: Verify And Publish

**Files:**
- Validate all modified files.

- [ ] Run `python3 -m unittest tests/test_rss_monitor.py -v`.
- [ ] Run `python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest` if the skill validator is available locally.
- [ ] Run `git diff --check`.
- [ ] Commit with `feat: improve rss digest observability`.
- [ ] Push to `origin/main`.
