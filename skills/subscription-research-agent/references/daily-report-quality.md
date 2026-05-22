# Daily Report Quality Checklist

Use this checklist before delivering an Agent-written subscription daily report. The deterministic CLI prepares evidence; the Agent is responsible for judging, merging, citing, and writing clearly.

## Checklist

1. Source coverage
   - Include scanned, succeeded, failed, and selected evidence counts when available.
   - Keep this to one or two lines in the report.

2. Original attribution
   - Preserve the difference between subscription feed source, commentary source, and original source.
   - Do not infer an original source when the evidence field is empty.

3. Duplicate merge
   - Merge repeated release notes, reposts, and same-event commentary into one story.
   - Use `merge_hints` and `merge_key` when the evidence brief provides them.

4. Noise filtering
   - Do not promote low-confidence, weak keyword, promotional, or off-theme items as main claims.
   - Treat `low_confidence` as a review warning, not an automatic exclusion.

5. Chinese readability
   - Use concise Chinese judgment sentences before item lists.
   - Preserve original English titles unless the user asks for translated titles.
   - Keep summaries short and explain why the item matters.

6. Follow-up quality
   - End with concrete questions tied to unresolved evidence.
   - Avoid generic prompts that could apply to any AI news day.

## Pass Criteria

A daily report is ready when:

- The lead section contains synthesis, not just sorted links.
- Related items are merged into stories.
- Original and commentary sources are distinguishable.
- Source health is present only as coverage context.
- Follow-up questions are specific enough to guide the next research run.
