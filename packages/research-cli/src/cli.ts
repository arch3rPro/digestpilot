#!/usr/bin/env node
import { Command } from "commander";
import { createEvidenceBrief } from "./commands/brief-evidence.js";
import { ingestRss } from "./commands/ingest-rss.js";
import { initWorkspace } from "./commands/init.js";
import {
  createSourceHealthRegistryPatch,
  renderSourceHealthMarkdown,
  summarizeSourceHealthHistory
} from "./sources/health.js";
import { openResearchDb } from "./workspace/db.js";
import { getWorkspacePaths } from "./workspace/paths.js";

const program = new Command();

program
  .name("subscription-research")
  .description("Local-first subscription research workspace CLI.")
  .version("0.3.0");

program
  .command("init")
  .description("Initialize a local research workspace.")
  .requiredOption("--workspace <path>", "Workspace directory")
  .action(async (options: { workspace: string }) => {
    await initWorkspace(options);
  });

program
  .command("ingest")
  .description("Ingest subscription channel data.")
  .argument("<channel>", "Channel type, for v0.3 use rss")
  .requiredOption("--workspace <path>", "Workspace directory")
  .requiredOption("--registry <path>", "RSS feed registry JSON file")
  .option("--rss-runtime <runtime>", "RSS runtime: node or python", "node")
  .option("--script-path <path>", "Path to rss_monitor.py")
  .option("--python <command>", "Python executable", "python3")
  .option("--since <window>", "Relative or absolute time window", "7d")
  .option("--keywords <csv>", "Keyword CSV")
  .option("--must-keywords <csv>", "Required keyword CSV")
  .option("--should-keywords <csv>", "Optional boost keyword CSV")
  .option("--exclude-keywords <csv>", "Excluded keyword CSV")
  .option("--min-score <number>", "Minimum score", parseInteger)
  .action(async (channel: string, options: Record<string, string | number | undefined>) => {
    if (channel !== "rss") {
      throw new Error(`Unsupported ingest channel: ${channel}`);
    }
    const result = await ingestRss({
      workspace: requiredString(options.workspace, "workspace"),
      registry: requiredString(options.registry, "registry"),
      rssRuntime: rssRuntime(optionalString(options.rssRuntime) ?? "node"),
      scriptPath: optionalString(options.scriptPath),
      python: optionalString(options.python),
      since: optionalString(options.since),
      keywords: optionalString(options.keywords),
      mustKeywords: optionalString(options.mustKeywords),
      shouldKeywords: optionalString(options.shouldKeywords),
      excludeKeywords: optionalString(options.excludeKeywords),
      minScore: optionalNumber(options.minScore)
    });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("brief")
  .description("Generate research briefs.")
  .argument("<kind>", "Brief type, for v0.3 use evidence")
  .requiredOption("--workspace <path>", "Workspace directory")
  .requiredOption("--question <text>", "Research question")
  .option("--since <window>", "Relative or absolute time window", "7d")
  .option("--must-keywords <csv>", "Required keyword CSV")
  .option("--must-keyword-mode <mode>", "Must keyword mode: any or all", "any")
  .option("--should-keywords <csv>", "Optional keyword CSV")
  .option("--exclude-keywords <csv>", "Excluded keyword CSV")
  .option("--min-score <number>", "Minimum score", parseInteger, 7)
  .option("--limit <number>", "Maximum evidence items", parseInteger, 20)
  .action(async (kind: string, options: Record<string, string | number | undefined>) => {
    if (kind !== "evidence") {
      throw new Error(`Unsupported brief kind: ${kind}`);
    }
    const result = await createEvidenceBrief({
      workspace: requiredString(options.workspace, "workspace"),
      question: requiredString(options.question, "question"),
      since: optionalString(options.since) ?? "7d",
      mustKeywords: optionalString(options.mustKeywords),
      mustKeywordMode: keywordMode(optionalString(options.mustKeywordMode) ?? "any"),
      shouldKeywords: optionalString(options.shouldKeywords),
      excludeKeywords: optionalString(options.excludeKeywords),
      minScore: optionalNumber(options.minScore),
      limit: optionalNumber(options.limit) ?? 20
    });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("source-health")
  .description("Summarize historical source health observations from the research workspace.")
  .requiredOption("--workspace <path>", "Workspace directory")
  .option("--min-observations <number>", "Minimum observations before making a recommendation", parseInteger, 2)
  .option("--disable-threshold <number>", "Failed observations required before suggesting disable", parseInteger, 3)
  .option("--format <format>", "Output format: json, markdown, or patch", "json")
  .action(async (options: Record<string, string | number | undefined>) => {
    const format = optionalString(options.format) ?? "json";
    if (!["json", "markdown", "patch"].includes(format)) {
      throw new Error(`Unsupported source-health format: ${format}`);
    }
    const paths = getWorkspacePaths(requiredString(options.workspace, "workspace"));
    const db = openResearchDb(paths.databasePath);
    try {
      const result = summarizeSourceHealthHistory(db, {
        minObservations: optionalNumber(options.minObservations) ?? 2,
        disableObservationThreshold: optionalNumber(options.disableThreshold) ?? 3
      });
      if (format === "markdown") {
        console.log(renderSourceHealthMarkdown(result));
      } else if (format === "patch") {
        console.log(JSON.stringify(createSourceHealthRegistryPatch(result), null, 2));
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
    } finally {
      db.close();
    }
  });

await program.parseAsync(process.argv);

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Expected integer, received: ${value}`);
  }
  return parsed;
}

function requiredString(value: string | number | undefined, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option: ${name}`);
  }
  return value;
}

function optionalString(value: string | number | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalNumber(value: string | number | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function keywordMode(value: string): "any" | "all" {
  if (value === "any" || value === "all") return value;
  throw new Error(`Unsupported must keyword mode: ${value}`);
}

function rssRuntime(value: string): "node" | "python" {
  if (value === "node" || value === "python") return value;
  throw new Error(`Unsupported RSS runtime: ${value}`);
}
