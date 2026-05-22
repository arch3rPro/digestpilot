# Examples

These examples show how an agent should invoke the RSS Skills suite. They are written as reusable prompts and workflow recipes rather than as a long command manual.

## Daily AI Digest

User request:

```text
Use rss-ai-digest to prepare today's AI and engineering reading digest from my RSS feeds.
Return a concise Markdown report with today's key points, top items, quick scan items, and recommended reading order.
```

Agent behavior:

- Use `skills/rss-ai-digest/SKILL.md` as the workflow entrypoint.
- Use a feed registry, seen-state file, and source-health file supplied by the caller or workspace.
- Prefer `digest` with `--preset ai-strict`.
- Follow `skills/rss-ai-digest/references/digest-report.md`.
- Keep the report focused on subscribed article content.
- Do not include source maintenance, failed-feed lists, or research follow-up questions unless the user asks for them.
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

## Subscription Research Memo

User request:

```text
Use subscription-research-agent to prepare a source-backed research memo about today's AI technology evidence.
Write it in Chinese with core judgments, cited evidence, caveats, and follow-up questions.
```

Agent behavior:

- Use `skills/subscription-research-agent/SKILL.md` as the workflow entrypoint.
- Initialize or reuse a local research workspace.
- Ingest RSS evidence first, or read the latest evidence brief if one already exists for the requested window.
- Generate or review an evidence brief before writing the final research memo.
- Follow `skills/subscription-research-agent/references/daily-report.md`.
- Keep the memo in standard Markdown and do not publish it externally unless the user requests a channel.

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

## Historical Source Health Review

User request:

```text
Use the local research workspace to review RSS sources that keep failing.
Return Markdown and do not modify the registry.
```

Agent behavior:

- Use `rss-source-curator` for source-health history and maintenance decisions.
- Run `subscription-research source-health --workspace research-workspace --min-observations 2 --format markdown`.
- Treat `disable_candidate` as a review signal, not permission to delete or disable a source.
- Keep this output separate from ordinary article digests.
