#!/usr/bin/env node
import { access, readFile, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pluginRoot = join(repoRoot, "plugins", "digestpilot");
const skillNames = ["rss-ai-digest", "public-trend-radar", "rss-source-curator", "subscription-research-agent"];

await assertFile(join(pluginRoot, ".claude-plugin", "plugin.json"));
await assertFile(join(pluginRoot, ".codex-plugin", "plugin.json"));
await assertFile(join(pluginRoot, "README.md"));
await assertFile(join(repoRoot, ".claude-plugin", "marketplace.json"));
await assertFile(join(repoRoot, ".agents", "plugins", "marketplace.json"));

const claudeManifest = await readJson(join(pluginRoot, ".claude-plugin", "plugin.json"));
const codexManifest = await readJson(join(pluginRoot, ".codex-plugin", "plugin.json"));
assertEqual(claudeManifest.name, "digestpilot", "Claude plugin name");
assertEqual(codexManifest.name, "digestpilot", "Codex plugin name");
assertEqual(claudeManifest.skills, "./skills/", "Claude skills path");
assertEqual(codexManifest.skills, "./skills/", "Codex skills path");

for (const skillName of skillNames) {
  await assertFile(join(pluginRoot, "skills", skillName, "SKILL.md"));
  const rootFiles = await listFiles(join(repoRoot, "skills", skillName));
  const pluginFiles = await listFiles(join(pluginRoot, "skills", skillName));
  assertEqual(JSON.stringify(pluginFiles), JSON.stringify(rootFiles), `${skillName} file list`);
  for (const file of rootFiles) {
    const rootContent = await readFile(join(repoRoot, "skills", skillName, file), "utf8");
    const pluginContent = await readFile(join(pluginRoot, "skills", skillName, file), "utf8");
    assertEqual(pluginContent, rootContent, `${skillName}/${file}`);
  }
}

console.log("DigestPilot plugin package validation passed.");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function assertFile(path) {
  await access(path, constants.R_OK);
}

async function listFiles(root, prefix = "") {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, entryPath)));
    } else if (entry.isFile()) {
      const info = await stat(join(root, entryPath));
      if (info.size >= 0) files.push(entryPath);
    }
  }
  return files.sort();
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch\nexpected: ${expected}\nactual: ${actual}`);
  }
}
