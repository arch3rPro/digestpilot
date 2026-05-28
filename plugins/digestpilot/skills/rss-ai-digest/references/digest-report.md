# Digest Report Output

Use this contract for ordinary RSS daily digests, key information summaries, and quick news lookup. This is not source maintenance and not deep research.

## Purpose

The report should help the user quickly understand subscribed information:

- what happened
- why it matters
- what to read first

Keep operational details out of the body unless they change the interpretation of the news.

## Default Sections

Use concise Markdown. Prefer these sections:

1. `今日要点`
2. `重点资讯`
3. `快速浏览`
4. `推荐阅读顺序`

Optional one-line caveat:

- `覆盖说明`: use only when source failures materially affect coverage.

Do not include by default:

- source maintenance or failed-feed lists
- source-health recommendations
- registry patch advice
- deep research questions
- long methodology or workflow notes

## Item Fields

For each important item, include:

- title
- source
- link
- short summary
- why it matters

Keep scores and ranking reasons internal unless the user asks why an item was selected.

## Routing Boundaries

- If the user asks for feed repair, source quality, failed feeds, or registry cleanup, use `rss-source-curator`.
- If the user asks for deep research, evidence briefs, research memo, hypothesis tracking, or follow-up questions, use `subscription-research-agent`.
- If the user asks for "日报", "今日资讯", "重点资讯", "快速看一下", or "有什么值得读", stay in this digest report contract.

## Chinese Style

- Use concise Chinese.
- Keep original article titles unless the user asks for translated titles.
- Prefer fewer high-signal items over broad coverage.
- Merge related release notes or repeated commentary into one story.
- Do not make the report look like a tool run log.
