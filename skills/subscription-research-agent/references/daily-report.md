# Daily Research Report

A daily research report is the Agent-written synthesis layer on top of an evidence brief. The deterministic CLI prepares source-backed evidence; the Agent writes the report, makes judgments explicit, and keeps citations attached to the evidence.

## When To Use

Use this contract when the user asks for:

- a daily research report
- a subscription daily
- an AI or technology daily
- a Chinese daily summary from subscription sources
- a memo based on today's RSS or subscription evidence

Do not use this contract as a replacement for evidence gathering. Generate or read an evidence brief first unless the user has already provided the evidence.

## Required Inputs

- Research question or daily theme.
- Time window, usually local-day or `24h`.
- Evidence brief Markdown or JSON.
- Source health summary when available.
- User language preference.

For local-day reports, prefer a fresh or report-specific seen-state so dedupe does not suppress current-day items.

## Required Sections

Use standard Markdown. Keep section names readable and stable:

1. `运行概况` or `Run Overview`
2. `今日核心判断` or `Key Judgments`
3. `重点资讯` or `Top Items`
4. `建议阅读顺序` or `Recommended Reading Order`
5. `信息源健康` or `Source Health`
6. `后续跟踪问题` or `Follow-up Questions`

## Top Item Fields

Each selected item should include:

- title
- source or commentary source
- original source when distinguishable
- author when available
- link
- score when available
- short summary
- why it matters

If an item is from a commentary feed that links to original reporting, make that distinction clear. Do not imply the commentary feed is the original publisher when the evidence shows otherwise.

## Quality Rules

- Lead with judgment, not a raw list of links.
- Separate evidence-backed claims from interpretation.
- Prefer fewer high-signal items over broad coverage.
- Explain why each selected item matters to the user or research theme.
- Mention source failures and coverage gaps.
- Do not cite scores as truth; use them as ranking signals.
- Avoid making claims that require full article reading when only RSS metadata or summaries were available.
- Keep notification, publishing, and external sharing outside this Skill unless the user explicitly requests a channel.

## Chinese Report Style

For Chinese daily reports:

- Use concise Chinese summaries.
- Preserve original English titles unless the user asks for translated titles.
- Include `标题`、`来源`、`作者`、`链接`、`摘要`、`解读` for each top item when practical.
- Use `今日核心判断` for synthesis and `后续跟踪问题` for open questions.

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
