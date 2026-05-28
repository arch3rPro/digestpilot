#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const localRuntimePath = "packages/research-cli/dist/src/cli.js";
const developmentCommand = "subscription-research";

export function resolveRuntimeCommand(options = {}) {
  const env = options.env ?? process.env;
  const commandExists = options.commandExists ?? defaultCommandExists;
  const fileExists = options.fileExists ?? existsSync;

  const override = env.DIGESTPILOT_RUNTIME_CMD?.trim();
  if (override) {
    return {
      ok: true,
      kind: "env",
      command: splitCommand(override),
      message: "Using DIGESTPILOT_RUNTIME_CMD."
    };
  }

  if (commandExists(developmentCommand)) {
    return {
      ok: true,
      kind: "path",
      command: [developmentCommand],
      message: "Using linked development runtime command from PATH."
    };
  }

  if (fileExists(join(repoRoot, localRuntimePath)) || fileExists(localRuntimePath)) {
    return {
      ok: true,
      kind: "local",
      command: ["node", localRuntimePath],
      message: "Using repository-local Node runtime entrypoint."
    };
  }

  return {
    ok: false,
    kind: "missing",
    command: [],
    message: "No runtime command found."
  };
}

export function checkNodeVersion(version = process.version) {
  const major = Number(version.replace(/^v/, "").split(".")[0]);
  return {
    ok: Number.isFinite(major) && major >= 20,
    version,
    required: ">=20"
  };
}

export function formatDoctorReport(result) {
  const lines = ["# DigestPilot Doctor", ""];
  lines.push(`- Node: ${result.node.ok ? "OK" : "FAIL"} ${result.node.version} (required ${result.node.required ?? ">=20"})`);
  if (result.runtime.ok) {
    lines.push(`- Runtime: OK ${result.runtime.command.join(" ")}`);
    lines.push(`- Runtime source: ${result.runtime.kind}`);
  } else {
    lines.push("- Runtime: FAIL");
    lines.push(`- Runtime message: ${result.runtime.message}`);
  }

  lines.push("", "## Local Setup");
  lines.push("- From a repository checkout, run CLI commands with `node packages/research-cli/dist/src/cli.js ...` when no linked command is available.");
  lines.push("- For local development, run `cd packages/research-cli && npm link` to expose the current development command on PATH.");
  lines.push("- To avoid depending on a fixed command name, set `DIGESTPILOT_RUNTIME_CMD` to the command this environment should use.");
  return `${lines.join("\n")}\n`;
}

export function runDoctor() {
  const node = checkNodeVersion();
  const runtime = resolveRuntimeCommand();
  return { node, runtime };
}

function defaultCommandExists(command) {
  const result = spawnSync("sh", ["-c", "command -v \"$1\"", "sh", command], {
    stdio: "ignore"
  });
  return result.status === 0;
}

function splitCommand(command) {
  return command.split(/\s+/).filter(Boolean);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = runDoctor();
  process.stdout.write(formatDoctorReport(result));
  if (!result.node.ok || !result.runtime.ok) process.exitCode = 1;
}
