import { spawn } from "node:child_process";
import type { RssDigestEnvelope } from "../types.js";

export interface RunRssDigestOptions {
  python?: string;
  scriptPath: string;
  registry: string;
  state: string;
  health?: string;
  since?: string;
  keywords?: string;
  mustKeywords?: string;
  shouldKeywords?: string;
  excludeKeywords?: string;
  minScore?: number;
}

export async function runRssDigest(options: RunRssDigestOptions): Promise<RssDigestEnvelope> {
  const args = [
    options.scriptPath,
    "digest",
    "--registry",
    options.registry,
    "--state",
    options.state,
    "--format",
    "json"
  ];
  if (options.health) args.push("--health", options.health);
  if (options.since) args.push("--since", options.since);
  if (options.keywords) args.push("--keywords", options.keywords);
  if (options.mustKeywords) args.push("--must-keywords", options.mustKeywords);
  if (options.shouldKeywords) args.push("--should-keywords", options.shouldKeywords);
  if (options.excludeKeywords) args.push("--exclude-keywords", options.excludeKeywords);
  if (typeof options.minScore === "number") args.push("--min-score", String(options.minScore));

  const output = await runProcess(options.python ?? "python3", args);
  return JSON.parse(output) as RssDigestEnvelope;
}

function runProcess(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(`${command} exited with code ${code}: ${stderr}`));
    });
  });
}
