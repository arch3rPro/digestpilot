# Daily Research Report

A research daily is the Agent-written synthesis layer on top of an evidence brief. The deterministic CLI prepares source-backed evidence; the Agent writes the report, makes judgments explicit, and keeps citations attached to the evidence.

## When To Use

Use this contract when the user asks for a research-oriented report, for example:

- a daily research report
- a source-backed research memo
- a deep-dive subscription synthesis
- a research-oriented Chinese synthesis from subscription sources
- a memo based on today's RSS or subscription evidence

Do not use this contract for ordinary "日报", "重点资讯", "今日资讯", or quick reading requests. Those belong to `rss-ai-digest` and should follow its quick digest output contract.

Do not use this contract as a replacement for evidence gathering. Generate or read an evidence brief first unless the user has already provided the evidence.

## Required Inputs

- Research question or daily theme.
- Time window, usually local-day or `24h`.
- Evidence brief Markdown or JSON.
- Source health summary when available.
- User language preference.

For local-day reports, prefer a fresh or report-specific seen-state so dedupe does not suppress current-day items.

When the evidence brief contains `daily_report_guidance`, use it as the first routing layer:

- Treat `priority_buckets.lead` as candidate lead stories, not a required exhaustive list.
- Use `priority_buckets.supporting` for context, caveats, and shorter mentions.
- Use `priority_buckets.watch` only when the item is relevant but should not anchor a judgment.
- Follow `merge_hints` to combine related release notes, reposts, and same-event commentary into one story.
- Check `quality_checklist` before delivering the final report.
- Follow `style_notes` unless the user gives a more specific writing preference.

For the full quality gate, see [`daily-report-quality.md`](./daily-report-quality.md).

## Required Sections

Use standard Markdown. Keep section names readable and stable:

1. `运行概况` or `Run Overview`
2. `今日核心判断` or `Key Judgments`
3. `重点资讯` or `Top Items`
4. `建议阅读顺序` or `Recommended Reading Order`
5. `信息源覆盖` or `Source Coverage`
6. `后续跟踪问题` or `Follow-up Questions`

## Top Item Fields

Each selected item should include:

- title
- source
- commentary source when detected
- original source when distinguishable
- original URL when available
- author when available
- link
- score when available
- short summary
- why it matters

If an item is from a commentary feed that links to original reporting, make that distinction clear. Do not imply the commentary feed is the original publisher when the evidence shows otherwise.

Use the evidence fields conservatively:

- `source`: the subscription feed source.
- `commentary_source`: the commentary or secondary source when the item appears to discuss another source.
- `original_source`: the detected original reporting, filing, paper, or quoted source.
- `original_url`: the original URL only when the evidence explicitly provides one.

If `original_source` is empty, do not infer one in the final report.

## Quality Rules

- Lead with judgment, not a raw list of links.
- Separate evidence-backed claims from interpretation.
- Prefer fewer high-signal items over broad coverage.
- Explain why each selected item matters to the user or research theme.
- Mention source coverage briefly, but do not turn the daily report into a source-maintenance report.
- Do not cite scores as truth; use them as ranking signals.
- Prefer evidence brief priority buckets over raw score order when choosing final top items.
- Merge related evidence items before writing `重点资讯`; do not repeat every package release or repost as a separate story.
- Avoid making claims that require full article reading when only RSS metadata or summaries were available.
- Prefer original-source wording when `original_source` is present, but still credit the commentary source when the subscription item is a commentary link.
- Keep notification, publishing, and external sharing outside this Skill unless the user explicitly requests a channel.

## Source Coverage Guidance

Daily reports are for subscribed information, not source governance. Keep source coverage short:

- Include scanned, succeeded, failed, and evidence item counts when available.
- Mention only material coverage gaps that affect interpretation.
- Do not list every failed source by default.
- Do not include disable/remove recommendations in a daily report.
- For feed repair, health history, or registry patches, route the user to `rss-source-curator`.

## Chinese Report Style

For Chinese daily reports:

- Use concise Chinese summaries.
- Preserve original English titles unless the user asks for translated titles.
- Include `标题`、`来源`、`作者`、`链接`、`摘要`、`解读` for each top item when practical.
- Use `今日核心判断` for synthesis and `后续跟踪问题` for open questions.
- Use `信息源覆盖` for a one- or two-line coverage note, not detailed source governance.
- Use short Chinese judgment sentences before item lists, so the report reads like a research daily rather than exported RSS rows.

## Output Location

When writing to a research workspace, use:

```text
research-workspace/notes/daily/YYYY-MM-DD-research-daily.zh-CN.md
```

For non-Chinese reports, use an appropriate language suffix, for example:

```text
research-workspace/notes/daily/YYYY-MM-DD-research-daily.en.md
```

The daily report is a human-readable note. JSON automation output should remain attached to the evidence brief.
