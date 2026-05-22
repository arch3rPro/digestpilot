# @subscription-research/cli

Local-first CLI for subscription research workspaces.

## Commands

```bash
subscription-research init --workspace research-workspace
subscription-research ingest rss --workspace research-workspace --registry feeds.json
subscription-research brief evidence --workspace research-workspace --question "AI daily" --since 24h
subscription-research source-health --workspace research-workspace --format markdown
subscription-research rss import-opml --opml feeds.opml --registry feeds.json
subscription-research rss digest --registry feeds.json --state seen.json --since 24h --preset ai-strict
subscription-research rss curate-sources --registry feeds.json --health source-health.json
```

RSS ingest and direct RSS registry commands use the Node/TypeScript RSS runtime.
