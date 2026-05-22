# @subscription-research/cli

Local-first CLI for subscription research workspaces.

## Commands

```bash
subscription-research init --workspace research-workspace
subscription-research ingest rss --workspace research-workspace --registry feeds.json
subscription-research brief evidence --workspace research-workspace --question "AI daily" --since 24h
subscription-research source-health --workspace research-workspace --format markdown
```

The current RSS ingest command can use the project Python worker in a local checkout. The Node RSS runtime preserves the same JSON envelope contract as it is introduced.
