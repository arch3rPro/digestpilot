# P1 Daily Report Regression

Date: 2026-05-22

## Purpose

Validate the local-first AI/technology daily report path against a real RSS run and convert observed daily-report quality issues into deterministic regression coverage.

## Run Summary 1

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

## Run Summary 2

- Theme: AI technology daily
- Time window: `24h`
- Feed registry size: 92 enabled sources
- Fetch result: 83 succeeded, 9 failed
- Entries fetched: 2437
- Entries after filtering: 22
- Entries archived: 20
- Evidence brief: generated successfully with priority buckets, merge hints, and quality checklist

## Run Summary 3

- Theme: Engineering and systems daily
- Time window: `72h`
- Feed registry size: 92 enabled sources
- Fetch result: 82 succeeded, 10 failed
- Entries fetched: 2436
- Entries after filtering: 59
- Entries archived: 37
- Evidence brief: generated successfully with priority buckets, merge hints, and quality checklist

## Source Health History Check

The second and third runs used the same temporary research workspace, so `subscription-research source-health --min-observations 2` produced multi-observation health history:

- Repeated failures stayed at `watch` with medium maintenance priority after two observations.
- Stable sources stayed at `keep` with low maintenance priority.
- A mixed source with one success and one failure stayed at `watch`, confirming the current policy does not disable sources too aggressively.

This closes the P1 requirement to accumulate source-health observations from multiple real local runs. Further source patch tuning can continue as normal source governance work.

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
- The first evidence brief lacked an explicit quality gate, so Agents had to infer source coverage, attribution, duplicate merging, noise filtering, Chinese readability, and follow-up quality checks from prose.

## Changes Made

- Added source diversification to evidence selection so a single feed is less likely to crowd out other high-signal sources.
- Added `daily_report_guidance` to evidence brief JSON and Markdown output.
- Added priority buckets for `lead`, `supporting`, and `watch`.
- Added merge hints for repeated or closely related story clusters.
- Added attribution labels so commentary feeds and original sources are clearer at report-writing time.
- Added low-confidence flags for evidence items that need review before becoming a main claim.
- Added a structured daily-report quality checklist to evidence brief JSON and Markdown.
- Added `daily-report-quality.md` as a reusable Skill reference.
- Updated daily report guidance to use these fields before writing the final synthesis.

## Regression Coverage

The Node test suite now covers:

- Daily-report guidance generation.
- Source diversification for repeated high-score source items.
- Duplicate story merge hints.
- Priority buckets that keep related duplicate items out of the main lead list.
- Attribution labels in JSON and Markdown output.
- Daily-report quality checklist fields and Markdown rendering.

## P1 Completion State

- Completed three real daily-report-path regressions in total.
- Completed multi-observation source-health validation in a shared local research workspace.
- Completed a reusable daily report quality checklist.
- Completed deterministic regression coverage for daily-report guidance output.

## Follow-up Tasks After P1

- Tune topic merge keys if more duplicate clusters appear in future real runs.
- Consider a future evidence item `story_role` field if Agents still treat related items as separate top stories.
- Add fixture-based tests for clickbait or weak summary-only matches when a concrete failure mode is observed.
- Move to P2 full-text/readability, feed discovery, or alert-monitor planning.
