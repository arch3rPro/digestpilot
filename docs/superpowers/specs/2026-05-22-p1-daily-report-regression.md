# P1 Daily Report Regression

Date: 2026-05-22

## Purpose

Validate the local-first AI/technology daily report path against a real RSS run and convert observed daily-report quality issues into deterministic regression coverage.

## Run Summary

- Input OPML: `skills/rss-ai-digest/references/base-feeds.opml`
- Source metadata: `skills/rss-ai-digest/references/source-metadata.json`
- Time window: `72h`
- Feed registry size: 92 enabled sources
- Fetch result: 84 succeeded, 8 failed
- Entries fetched: 2537
- Entries after filtering: 62
- Entries archived: 60
- Evidence brief limit: 20

Runtime workspace artifacts were kept outside the repository because they contain local run state and fetched reading data. The validation record captures the stable findings and regression expectations.

## Source Failures Observed

The run completed successfully despite isolated feed failures. Failed sources were treated as source-health inputs, not digest blockers:

- `blog-pixelmelt-dev`: unsupported feed root, likely HTML instead of RSS/Atom.
- `derekthompson-org`: fetch failed.
- `dwarkesh-com`: fetch failed.
- `garymarcus-substack-com`: fetch failed.
- `gwern-net`: fetch failed.
- `lcamtuf-substack-com`: fetch failed.
- `tedunangst-com`: fetch failed.
- `worksonmymachine-substack-com`: fetch failed.

These should remain source-curation concerns. Daily reports should mention only the aggregate coverage impact unless the user asks for source maintenance details.

## Quality Issues Found

- Raw score ordering allowed one trusted source to dominate the top evidence list.
- Multiple related `Datasette Agent` release notes appeared as separate lead candidates.
- Evidence brief did not provide a clear enough routing layer for Agent-written daily reports.
- Source-health details were available, but should not be expanded inside the daily report body.

## Changes Made

- Added source diversification to evidence selection so a single feed is less likely to crowd out other high-signal sources.
- Added `daily_report_guidance` to evidence brief JSON and Markdown output.
- Added priority buckets for `lead`, `supporting`, and `watch`.
- Added merge hints for repeated or closely related story clusters.
- Added attribution labels so commentary feeds and original sources are clearer at report-writing time.
- Added low-confidence flags for evidence items that need review before becoming a main claim.
- Updated daily report guidance to use these fields before writing the final synthesis.

## Regression Coverage

The Node test suite now covers:

- Daily-report guidance generation.
- Source diversification for repeated high-score source items.
- Duplicate story merge hints.
- Priority buckets that keep related duplicate items out of the main lead list.
- Attribution labels in JSON and Markdown output.

## Follow-up Tasks

- Run 2-4 additional real daily reports to accumulate source-health history and ranking observations.
- Tune topic merge keys using more observed duplicate clusters.
- Consider a future evidence item `story_role` field if Agents still treat related items as separate top stories.
- Add fixture-based tests for clickbait or weak summary-only matches when a real failure mode is observed.
