# Runtime Setup

DigestPilot Skills call a deterministic Node runtime. The current development binary is `subscription-research`, but that command name is not a permanent product contract.

## Command Resolution

Agents should resolve the runtime command in this order:

1. If `DIGESTPILOT_RUNTIME_CMD` is set, use it as the runtime command prefix.
2. If `subscription-research` is available on `PATH`, use the Skill examples as written.
3. From a repository checkout, use `node packages/research-cli/dist/src/cli.js` followed by the same subcommands.

Example fallback:

```bash
node packages/research-cli/dist/src/cli.js trend fetch-public \
  --profile ai-tech \
  --output-dir research-workspace/public-trend-radar/latest
```

## Local Development

Build and link the current runtime:

```bash
cd packages/research-cli
npm install
npm run build
npm link
```

Then verify:

```bash
subscription-research --version
node scripts/doctor.mjs
```

## Doctor

Run from the repository root:

```bash
node scripts/doctor.mjs
```

The doctor checks Node version, the linked development command, and the repository-local runtime entrypoint. It also documents the fallback command to use when the linked command is unavailable.
