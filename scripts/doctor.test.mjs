import assert from "node:assert/strict";
import test from "node:test";
import { formatDoctorReport, resolveRuntimeCommand } from "./doctor.mjs";

test("resolveRuntimeCommand honors an explicit runtime command override", () => {
  const result = resolveRuntimeCommand({
    env: { DIGESTPILOT_RUNTIME_CMD: "digestpilot-runtime" },
    commandExists: () => false,
    fileExists: () => true
  });

  assert.equal(result.kind, "env");
  assert.deepEqual(result.command, ["digestpilot-runtime"]);
});

test("resolveRuntimeCommand uses the linked development command when available", () => {
  const result = resolveRuntimeCommand({
    env: {},
    commandExists: (command) => command === "subscription-research",
    fileExists: () => true
  });

  assert.equal(result.kind, "path");
  assert.deepEqual(result.command, ["subscription-research"]);
});

test("resolveRuntimeCommand falls back to the repository-local Node entrypoint", () => {
  const result = resolveRuntimeCommand({
    env: {},
    commandExists: () => false,
    fileExists: (path) => path.endsWith("packages/research-cli/dist/src/cli.js")
  });

  assert.equal(result.kind, "local");
  assert.deepEqual(result.command, ["node", "packages/research-cli/dist/src/cli.js"]);
});

test("formatDoctorReport recommends local setup without prescribing a permanent CLI name", () => {
  const report = formatDoctorReport({
    node: { ok: true, version: "v22.0.0" },
    runtime: {
      ok: false,
      kind: "missing",
      command: [],
      message: "No runtime command found."
    }
  });

  assert.match(report, /npm link/);
  assert.match(report, /DIGESTPILOT_RUNTIME_CMD/);
  assert.doesNotMatch(report, /npx @subscription-research\/cli/);
});
