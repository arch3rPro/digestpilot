#!/usr/bin/env node
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pluginName = "digestpilot";
const displayName = "DigestPilot";
const repositoryUrl = "https://github.com/arch3rPro/digestpilot";
const pluginRoot = join(repoRoot, "plugins", pluginName);
const skillNames = ["rss-ai-digest", "public-trend-radar", "rss-source-curator", "subscription-research-agent"];
const requestedTarget = targetArg();
const version = (await readFile(join(repoRoot, "VERSION"), "utf8")).trim();

await mkdir(pluginRoot, { recursive: true });
await copySkills();
await writePluginReadme();
if (requestedTarget === "all" || requestedTarget === "claude") {
  await writeClaudeManifest();
  await writeClaudeMarketplace();
}
if (requestedTarget === "all" || requestedTarget === "codex") {
  await writeCodexManifest();
  await writeCodexMarketplace();
}

console.log(`Built ${displayName} plugin package for ${requestedTarget}: ${relative(pluginRoot)}`);

function targetArg() {
  const index = process.argv.indexOf("--target");
  const value = index >= 0 ? process.argv[index + 1] : "all";
  if (value === "all" || value === "claude" || value === "codex") return value;
  throw new Error(`Unsupported --target value: ${value}`);
}

async function copySkills() {
  const targetSkillsDir = join(pluginRoot, "skills");
  await rm(targetSkillsDir, { recursive: true, force: true });
  await mkdir(targetSkillsDir, { recursive: true });
  for (const skillName of skillNames) {
    await cp(join(repoRoot, "skills", skillName), join(targetSkillsDir, skillName), {
      recursive: true,
      dereference: true
    });
  }
}

async function writeClaudeManifest() {
  await mkdir(join(pluginRoot, ".claude-plugin"), { recursive: true });
  await writeJson(join(pluginRoot, ".claude-plugin", "plugin.json"), {
    $schema: "https://json.schemastore.org/claude-code-plugin-manifest.json",
    name: pluginName,
    displayName,
    description: "Aggregate trusted information streams into daily briefs and research-ready evidence.",
    version,
    author: {
      name: "arch3rPro"
    },
    homepage: repositoryUrl,
    repository: repositoryUrl,
    license: "MIT",
    keywords: ["digest", "rss", "research", "briefing", "agent"],
    skills: "./skills/"
  });
}

async function writeCodexManifest() {
  await mkdir(join(pluginRoot, ".codex-plugin"), { recursive: true });
  await writeJson(join(pluginRoot, ".codex-plugin", "plugin.json"), {
    name: pluginName,
    version,
    description: "Aggregate trusted information streams into daily briefs and research-ready evidence.",
    author: {
      name: "arch3rPro",
      url: "https://github.com/arch3rPro"
    },
    homepage: repositoryUrl,
    repository: repositoryUrl,
    license: "MIT",
    keywords: ["digest", "rss", "research", "briefing", "agent"],
    skills: "./skills/",
    interface: {
      displayName,
      shortDescription: "Daily briefs and research-ready evidence for agents.",
      longDescription:
        "DigestPilot helps agents aggregate RSS, public trend signals, source governance data, and local research evidence into reviewable daily briefs and research workflows.",
      developerName: "arch3rPro",
      category: "Productivity",
      capabilities: ["Research", "Automation", "Write"],
      websiteURL: repositoryUrl,
      defaultPrompt: [
        "Prepare an AI daily brief from my subscriptions.",
        "Find public AI trends and produce trend cards.",
        "Build a research evidence brief from archived feeds."
      ],
      brandColor: "#2563EB"
    }
  });
}

async function writePluginReadme() {
  const readme = `# ${displayName} Plugin

DigestPilot turns trusted information streams into daily briefs and research-ready evidence for AI agents.

## Included Skills

- \`rss-ai-digest\`: RSS/Atom digest, monitoring, filtering, scoring, and dedupe.
- \`public-trend-radar\`: public-channel trend cards from HN, GitHub releases, and URL lists.
- \`rss-source-curator\`: source quality governance and reviewable registry maintenance.
- \`subscription-research-agent\`: local-first evidence briefs and research report workflows.

## Runtime

Plugin installation provides Skills only. The deterministic runtime remains the Node CLI from \`packages/research-cli\` and must be installed, linked, or invoked from a repository checkout.

The current development command is \`subscription-research\`, but the command name is not a permanent product contract. Resolve the runtime command in this order:

1. Use \`DIGESTPILOT_RUNTIME_CMD\` when it is set.
2. Use \`subscription-research\` when it is available on \`PATH\`.
3. From a repository checkout, use:

\`\`\`bash
node packages/research-cli/dist/src/cli.js --help
\`\`\`

For local development:

\`\`\`bash
cd packages/research-cli
npm install
npm run build
npm link
cd ../..
node scripts/doctor.mjs
\`\`\`

## Claude Code

Test locally:

\`\`\`bash
claude --plugin-dir ./plugins/digestpilot
\`\`\`

Plugin skills are namespaced, for example \`/digestpilot:rss-ai-digest\`.

Marketplace development:

\`\`\`text
/plugin marketplace add .
/plugin install digestpilot@digestpilot
\`\`\`

## Codex

The Codex manifest lives at \`.codex-plugin/plugin.json\`. Use the repository marketplace at \`.agents/plugins/marketplace.json\` during local plugin development.
`;
  await writeFile(join(pluginRoot, "README.md"), readme, "utf8");
}

async function writeClaudeMarketplace() {
  await mkdir(join(repoRoot, ".claude-plugin"), { recursive: true });
  await writeJson(join(repoRoot, ".claude-plugin", "marketplace.json"), {
    name: "digestpilot",
    owner: {
      name: "arch3rPro"
    },
    description: "DigestPilot plugin marketplace for local development.",
    plugins: [
      {
        name: pluginName,
        displayName,
        source: "./plugins/digestpilot",
        description: "Daily briefs and research-ready evidence for AI agents.",
        category: "productivity",
        tags: ["digest", "rss", "research", "agent"]
      }
    ]
  });
}

async function writeCodexMarketplace() {
  await mkdir(join(repoRoot, ".agents", "plugins"), { recursive: true });
  await writeJson(join(repoRoot, ".agents", "plugins", "marketplace.json"), {
    name: "digestpilot",
    interface: {
      displayName: "DigestPilot"
    },
    plugins: [
      {
        name: pluginName,
        source: {
          source: "local",
          path: "./plugins/digestpilot"
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL"
        },
        category: "Productivity"
      }
    ]
  });
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function relative(path) {
  return path.startsWith(repoRoot) ? path.slice(repoRoot.length + 1) : path;
}
