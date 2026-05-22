#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { Command } from "commander";
import { createEvidenceBrief } from "./commands/brief-evidence.js";
import { enrichArticleContent } from "./commands/enrich-content.js";
import { ingestRss } from "./commands/ingest-rss.js";
import { initWorkspace } from "./commands/init.js";
import {
  applySourceRegistryPatch,
  curateSourceRegistry,
  discoverFeedPages,
  discoverFeeds,
  digestRss,
  evaluateSourceRegistry,
  fetchRss,
  importOpml
} from "./commands/rss.js";
import { extractDiscoveryUrls } from "./rss/discovery.js";
import { renderJson, renderMarkdownDigest, renderMarkdownDigestResult, renderMarkdownSourceCuration, renderMarkdownSourcePatchResult } from "./rss/render.js";
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

const content = program.command("content").description("Fetch and enrich archived article content.");

content
  .command("fetch")
  .description("Fetch archived article HTML, extract readable content, and cache it locally.")
  .requiredOption("--workspace <path>", "Workspace directory")
  .option("--since <window>", "Relative or absolute time window")
  .option("--min-score <number>", "Minimum archived article score", parseInteger, 0)
  .option("--limit <number>", "Maximum articles to enrich", parseInteger, 20)
  .option("--article-id <id>", "Only enrich one archived article")
  .option("--timeout <seconds>", "Per-article timeout in seconds", parseInteger, 20)
  .option("--refetch", "Refetch content even when fetched content already exists")
  .action(async (options: Record<string, string | number | boolean | undefined>) => {
    const result = await enrichArticleContent({
      workspace: requiredString(options.workspace, "workspace"),
      since: optionalString(options.since),
      minScore: optionalNumber(options.minScore),
      limit: optionalNumber(options.limit),
      articleId: optionalString(options.articleId),
      timeout: optionalNumber(options.timeout),
      refetch: options.refetch === true
    });
    console.log(JSON.stringify(result, null, 2));
  });

const rss = program.command("rss").description("Run direct RSS registry workflows with the Node runtime.");

rss
  .command("import-opml")
  .description("Import OPML subscriptions into a registry JSON file.")
  .requiredOption("--opml <path>", "OPML input file")
  .requiredOption("--registry <path>", "Registry output JSON file")
  .option("--metadata <path>", "Optional source metadata JSON")
  .action(async (options: Record<string, string | number | undefined>) => {
    const result = await importOpml({
      opml: requiredString(options.opml, "opml"),
      registry: requiredString(options.registry, "registry"),
      metadata: optionalString(options.metadata)
    });
    process.stdout.write(renderJson(result));
  });

rss
  .command("fetch")
  .description("Fetch enabled feeds and output normalized entries.")
  .requiredOption("--registry <path>", "RSS feed registry JSON file")
  .option("--format <format>", "Output format: json or markdown", "json")
  .option("--timeout <seconds>", "Per-feed timeout in seconds", parseInteger, 20)
  .option("--max-workers <number>", "Maximum concurrent feed fetches", parseInteger, 8)
  .action(async (options: Record<string, string | number | undefined>) => {
    const result = await fetchRss({
      registry: requiredString(options.registry, "registry"),
      timeout: optionalNumber(options.timeout),
      maxWorkers: optionalNumber(options.maxWorkers)
    });
    const format = outputFormat(optionalString(options.format) ?? "json");
    process.stdout.write(format === "markdown" ? renderMarkdownDigest(result.entries, "Fetched RSS Entries") : renderJson(result));
  });

rss
  .command("discover")
  .description("Discover RSS or Atom feed links from one web page or a URL list.")
  .option("--url <url>", "Web page URL to inspect")
  .option("--input <path>", "Text or Markdown file containing page URLs to inspect")
  .option("--timeout <seconds>", "Page fetch timeout in seconds", parseInteger, 20)
  .option("--validate", "Fetch discovered feeds and verify they parse")
  .action(async (options: Record<string, string | number | boolean | undefined>) => {
    const urls = await discoveryUrls(options);
    const result =
      urls.length === 1
        ? await discoverFeeds({
            url: urls[0],
            timeout: optionalNumber(options.timeout),
            validate: options.validate === true
          })
        : await discoverFeedPages({
            urls,
            timeout: optionalNumber(options.timeout),
            validate: options.validate === true
          });
    process.stdout.write(renderJson(result));
  });

rss
  .command("digest")
  .description("Fetch, filter, score, dedupe, and render a digest.")
  .requiredOption("--registry <path>", "RSS feed registry JSON file")
  .requiredOption("--state <path>", "Seen-state JSON file")
  .option("--health <path>", "Source health JSON file")
  .option("--since <window>", "Relative or absolute time window", "24h")
  .option("--preset <preset>", "Digest preset", "none")
  .option("--keywords <csv>", "Keyword CSV")
  .option("--must-keywords <csv>", "Required keyword CSV")
  .option("--should-keywords <csv>", "Optional boost keyword CSV")
  .option("--exclude-keywords <csv>", "Excluded keyword CSV")
  .option("--keyword-mode <mode>", "Keyword mode: any or all", "any")
  .option("--require-any-title-keyword", "Require at least one title keyword match")
  .option("--author <text>", "Author filter")
  .option("--category <text>", "Feed category filter")
  .option("--language <text>", "Feed language filter")
  .option("--format <format>", "Output format: json or markdown", "markdown")
  .option("--mark-seen <policy>", "Seen-state policy: reported-only, all-filtered, or none", "reported-only")
  .option("--timeout <seconds>", "Per-feed timeout in seconds", parseInteger, 20)
  .option("--max-workers <number>", "Maximum concurrent feed fetches", parseInteger, 8)
  .option("--min-score <number>", "Minimum score", parseInteger, 7)
  .action(async (options: Record<string, string | number | boolean | undefined>) => {
    const result = await digestRss(digestOptions(options, 7));
    const format = outputFormat(optionalString(options.format) ?? "markdown");
    process.stdout.write(format === "json" ? renderJson(result) : renderMarkdownDigestResult(result));
  });

rss
  .command("check-new")
  .description("Fetch and report new matching entries.")
  .requiredOption("--registry <path>", "RSS feed registry JSON file")
  .requiredOption("--state <path>", "Seen-state JSON file")
  .option("--health <path>", "Source health JSON file")
  .option("--since <window>", "Relative or absolute time window", "24h")
  .option("--preset <preset>", "Digest preset", "none")
  .option("--keywords <csv>", "Keyword CSV")
  .option("--must-keywords <csv>", "Required keyword CSV")
  .option("--should-keywords <csv>", "Optional boost keyword CSV")
  .option("--exclude-keywords <csv>", "Excluded keyword CSV")
  .option("--keyword-mode <mode>", "Keyword mode: any or all", "any")
  .option("--require-any-title-keyword", "Require at least one title keyword match")
  .option("--author <text>", "Author filter")
  .option("--category <text>", "Feed category filter")
  .option("--language <text>", "Feed language filter")
  .option("--format <format>", "Output format: json or markdown", "markdown")
  .option("--mark-seen <policy>", "Seen-state policy: reported-only, all-filtered, or none", "reported-only")
  .option("--timeout <seconds>", "Per-feed timeout in seconds", parseInteger, 20)
  .option("--max-workers <number>", "Maximum concurrent feed fetches", parseInteger, 8)
  .option("--min-score <number>", "Minimum score", parseInteger, 0)
  .action(async (options: Record<string, string | number | boolean | undefined>) => {
    const result = await digestRss(digestOptions(options, 0));
    const format = outputFormat(optionalString(options.format) ?? "markdown");
    process.stdout.write(format === "json" ? renderJson(result) : renderMarkdownDigestResult(result));
  });

rss
  .command("evaluate-sources")
  .description("Evaluate source quality from registry and health JSON.")
  .requiredOption("--registry <path>", "RSS feed registry JSON file")
  .option("--health <path>", "Source health JSON file")
  .action(async (options: Record<string, string | number | undefined>) => {
    process.stdout.write(renderJson(await evaluateSourceRegistry(sourceRegistryOptions(options))));
  });

rss
  .command("curate-sources")
  .description("Generate reviewable source curation actions without modifying the registry.")
  .requiredOption("--registry <path>", "RSS feed registry JSON file")
  .option("--health <path>", "Source health JSON file")
  .option("--format <format>", "Output format: json or markdown", "markdown")
  .action(async (options: Record<string, string | number | undefined>) => {
    const result = await curateSourceRegistry(sourceRegistryOptions(options));
    const format = outputFormat(optionalString(options.format) ?? "markdown");
    process.stdout.write(format === "json" ? renderJson(result) : renderMarkdownSourceCuration(result));
  });

rss
  .command("apply-source-patch")
  .description("Dry-run or apply reviewable source registry patches to an explicit output file.")
  .requiredOption("--registry <path>", "RSS feed registry JSON file")
  .requiredOption("--patch <path>", "Source patch JSON file")
  .option("--output <path>", "Registry output file when applying")
  .option("--apply", "Apply the patch instead of dry-run")
  .option("--format <format>", "Output format: json or markdown", "markdown")
  .action(async (options: Record<string, string | number | boolean | undefined>) => {
    const result = await applySourceRegistryPatch({
      registry: requiredString(options.registry, "registry"),
      patch: requiredString(options.patch, "patch"),
      output: optionalString(options.output),
      apply: options.apply === true
    });
    const format = outputFormat(optionalString(options.format) ?? "markdown");
    process.stdout.write(format === "json" ? renderJson(result) : renderMarkdownSourcePatchResult(result));
  });

await program.parseAsync(process.argv);

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Expected integer, received: ${value}`);
  }
  return parsed;
}

function requiredString(value: string | number | boolean | undefined, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option: ${name}`);
  }
  return value;
}

function optionalString(value: string | number | boolean | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalNumber(value: string | number | boolean | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function keywordMode(value: string): "any" | "all" {
  if (value === "any" || value === "all") return value;
  throw new Error(`Unsupported must keyword mode: ${value}`);
}

function digestOptions(options: Record<string, string | number | boolean | undefined>, defaultMinScore: number) {
  return {
    registry: requiredString(options.registry, "registry"),
    state: requiredString(options.state, "state"),
    health: optionalString(options.health),
    since: optionalString(options.since),
    preset: digestPreset(optionalString(options.preset) ?? "none"),
    keywords: optionalString(options.keywords),
    mustKeywords: optionalString(options.mustKeywords),
    shouldKeywords: optionalString(options.shouldKeywords),
    excludeKeywords: optionalString(options.excludeKeywords),
    keywordMode: keywordMode(optionalString(options.keywordMode) ?? "any"),
    requireAnyTitleKeyword: options.requireAnyTitleKeyword === true,
    author: optionalString(options.author),
    category: optionalString(options.category),
    language: optionalString(options.language),
    markSeen: markSeenPolicy(optionalString(options.markSeen) ?? "reported-only"),
    timeout: optionalNumber(options.timeout),
    maxWorkers: optionalNumber(options.maxWorkers),
    minScore: optionalNumber(options.minScore) ?? defaultMinScore
  };
}

function sourceRegistryOptions(options: Record<string, string | number | undefined>) {
  return {
    registry: requiredString(options.registry, "registry"),
    health: optionalString(options.health)
  };
}

function outputFormat(value: string): "json" | "markdown" {
  if (value === "json" || value === "markdown") return value;
  throw new Error(`Unsupported output format: ${value}`);
}

async function discoveryUrls(options: Record<string, string | number | boolean | undefined>): Promise<string[]> {
  const urls: string[] = [];
  const directUrl = optionalString(options.url);
  if (directUrl) urls.push(directUrl);
  const input = optionalString(options.input);
  if (input) {
    urls.push(...extractDiscoveryUrls(await readFile(input, "utf8")));
  }
  const uniqueUrls = [...new Set(urls)];
  if (uniqueUrls.length === 0) {
    throw new Error("Missing required option: url or input");
  }
  return uniqueUrls;
}

function markSeenPolicy(value: string): "reported-only" | "all-filtered" | "none" {
  if (value === "reported-only" || value === "all-filtered" || value === "none") return value;
  throw new Error(`Unsupported mark-seen policy: ${value}`);
}

function digestPreset(value: string): "none" | "ai-strict" | "ai-research" | "engineering-deep-dive" | "security-risk" | "product-tech" {
  if (
    value === "none" ||
    value === "ai-strict" ||
    value === "ai-research" ||
    value === "engineering-deep-dive" ||
    value === "security-risk" ||
    value === "product-tech"
  ) {
    return value;
  }
  throw new Error(`Unsupported digest preset: ${value}`);
}
