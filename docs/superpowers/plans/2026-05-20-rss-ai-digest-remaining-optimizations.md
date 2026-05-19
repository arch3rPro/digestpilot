# RSS AI Digest Remaining Optimizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining RSS AI Digest optimization phases: concurrent fetch, token-aware matching, source metadata enrichment, and richer source governance semantics.

**Architecture:** Extend the existing standard-library CLI in place. Keep output deterministic by sorting fetched entries, scored entries, failures, and source-evaluation rows. Preserve explicit file paths and avoid runtime-specific assumptions.

**Tech Stack:** Python 3 standard library, `concurrent.futures.ThreadPoolExecutor`, `re`, `argparse`, `unittest`.

---

## File Structure

- Modify `skills/rss-ai-digest/scripts/rss_monitor.py`: add concurrent fetch, timeout/max-worker args, token-aware matching, metadata enrichment, deterministic ranking, and source governance fields.
- Modify `tests/test_rss_monitor.py`: add tests for concurrent fetch equivalence, failure isolation, deterministic ordering, token-aware matching, phrase matching, title/summary match locations, metadata enrichment, and source status/reason output.
- Add `skills/rss-ai-digest/references/source-metadata.json`: starter metadata for curated base feeds.
- Modify `skills/rss-ai-digest/SKILL.md`, `references/feed-registry.md`, `references/scoring.md`, `README.md`, and `CHANGELOG.md`.

### Task 1: Phase 2 Performance Tests

- [x] Add tests proving `fetch_entries(..., max_workers=1)` and `fetch_entries(..., max_workers=4)` return the same entries and health for controlled fixture fetches.
- [x] Add a test proving one failing feed produces health for that feed without aborting other feeds.
- [x] Add a test proving scored digest entries are ordered by score, published date, feed id, and title.
- [x] Run tests and confirm these new tests fail before implementation.

### Task 2: Phase 2 Performance Implementation

- [x] Add `fetch_one_feed(feed, timeout)` helper.
- [x] Update `fetch_entries(registry, timeout=20, max_workers=8)` with serial and concurrent paths.
- [x] Add `--timeout` and `--max-workers` to `fetch`, `digest`, and `check-new`.
- [x] Add deterministic `sort_entries()` / `sort_scored_entries()` helpers.
- [x] Run tests and confirm all pass.

### Task 3: Phase 3 Scoring Precision Tests

- [x] Add tests proving keyword `ai` does not match unrelated substrings.
- [x] Add tests proving multi-word phrase keywords still match.
- [x] Add tests proving `matched_keyword_locations` includes `title` and `summary`.
- [x] Add tests proving title matches score higher than summary-only matches.
- [x] Add tests proving `import-opml --metadata source-metadata.json` enriches base score, language, and tags.
- [x] Run tests and confirm these new tests fail before implementation.

### Task 4: Phase 3 Scoring Precision Implementation

- [x] Add tokenization helpers based on the Python standard library.
- [x] Update `filter_entries()` to perform exact token matching for single-word keywords and phrase matching for multi-word keywords.
- [x] Store `matched_keywords` and `matched_keyword_locations` on entries.
- [x] Update `score_entry()` to reward title matches and lightly penalize weak summary-only matches.
- [x] Add metadata loading and enrichment support to `import-opml`.
- [x] Add `references/source-metadata.json`.
- [x] Run tests and confirm all pass.

### Task 5: Phase 4 Source Governance Tests

- [x] Add tests proving no-health sources return `status: unknown`, `recommendation: watch`, and a clear `recommendation_reason`.
- [x] Add tests proving repeated failures return `status: failing`, include `last_error`, and recommend remove/lower priority.
- [x] Add tests proving healthy high-quality sources return `status: healthy` and `recommendation: keep`.
- [x] Run tests and confirm these new tests fail before implementation.

### Task 6: Phase 4 Source Governance Implementation

- [x] Update `evaluate_sources()` to emit `status`, `recommendation_reason`, and `last_error`.
- [x] Treat missing health as unknown rather than low quality.
- [x] Preserve existing score fields for compatibility.
- [x] Run tests and confirm all pass.

### Task 7: Documentation And Verification

- [x] Update Skill and README examples with `--timeout`, `--max-workers`, and `--metadata`.
- [x] Update feed registry and scoring references.
- [x] Update CHANGELOG.
- [x] Run `python3 -m unittest tests/test_rss_monitor.py -v`.
- [x] Run the skill validator when available.
- [x] Run `git diff --check`.
- [x] Scan public docs for local absolute paths, placeholders, and stale names.
- [ ] Commit with `feat: complete rss digest optimizations`.
- [ ] Push to `origin/main`.
