# Examples

These examples show how an agent should invoke the RSS Skills suite. They are written as reusable prompts and workflow recipes rather than as a long command manual.

## Daily AI Digest

User request:

```text
Use rss-ai-digest to prepare today's AI and engineering reading digest from my RSS feeds.
Return a concise Markdown report with title, source, score, link, and why each item was selected.
```

Agent behavior:

- Use `skills/rss-ai-digest/SKILL.md` as the workflow entrypoint.
- Use a feed registry, seen-state file, and source-health file supplied by the caller or workspace.
- Prefer `digest` with `--preset ai-strict`.
- Mention failed feeds separately from article results.
- Mark only reported entries as seen.

## Topic Monitor

User request:

```text
Use rss-ai-digest to monitor new posts about LLM evals, inference, and agent reliability.
Return JSON so another automation can route alerts.
```

Agent behavior:

- Use `check-new` for monitoring workflows.
- Pass explicit keywords and state paths.
- Use JSON output for downstream automations.
- Keep notification delivery outside the Skill unless the user asks for a specific channel.

## OPML Import

User request:

```text
Import this OPML file into an rss-ai-digest feed registry and apply the curated source metadata.
```

Agent behavior:

- Use `import-opml`.
- Apply `skills/rss-ai-digest/references/source-metadata.json` when available.
- Keep the generated registry out of Git unless the user explicitly says it is public.

## Source Quality Review

User request:

```text
Review my RSS sources and tell me which ones should be kept, watched, disabled, or removed.
Do not modify the registry yet.
```

Agent behavior:

- Use `skills/rss-source-curator/SKILL.md` as the workflow entrypoint.
- Use `evaluate-sources` when the user needs source scoring.
- Use `curate-sources` when the user needs reviewable maintenance actions.
- Do not apply registry patches until the user reviews the recommendations.

## Subscription Research Daily

User request:

```text
Use subscription-research-agent to prepare today's AI technology research daily from local subscription evidence.
Write it in Chinese with core judgments, top items, source health, and follow-up questions.
```

Agent behavior:

- Use `skills/subscription-research-agent/SKILL.md` as the workflow entrypoint.
- Initialize or reuse a local research workspace.
- Ingest RSS evidence first, or read the latest evidence brief if one already exists for the requested window.
- Generate or review an evidence brief before writing the final daily report.
- Follow `skills/subscription-research-agent/references/daily-report.md`.
- Keep the daily report in standard Markdown and do not publish it externally unless the user requests a channel.

## Apply Reviewed Source Patch

User request:

```text
Apply the reviewed source curation patch to a new registry file.
Keep the original registry unchanged.
```

Agent behavior:

- Use `skills/rss-source-curator/SKILL.md` as the workflow entrypoint.
- Use `apply-source-patch`.
- Require an explicit output file.
- Prefer dry-run first unless the user already confirmed the patch.
