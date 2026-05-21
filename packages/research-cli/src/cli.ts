#!/usr/bin/env node
import { Command } from "commander";
import { createEvidenceBrief } from "./commands/brief-evidence.js";
import { ingestRss } from "./commands/ingest-rss.js";
import { initWorkspace } from "./commands/init.js";

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
      shouldKeywords: optionalString(options.shouldKeywords),
      excludeKeywords: optionalString(options.excludeKeywords),
      minScore: optionalNumber(options.minScore),
      limit: optionalNumber(options.limit) ?? 20
    });
    console.log(JSON.stringify(result, null, 2));
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
