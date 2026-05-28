import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

test("package metadata exposes the current development CLI bin", async () => {
  const packageJson = JSON.parse(
    await readFile(join(process.cwd(), "package.json"), "utf8")
  ) as {
    private?: boolean;
    bin?: Record<string, string>;
    files?: string[];
    engines?: Record<string, string>;
  };

  assert.equal(packageJson.private, false);
  assert.deepEqual(packageJson.bin, {
    "subscription-research": "./dist/src/cli.js"
  });
  assert.deepEqual(packageJson.files, ["dist/src", "README.md", "package.json"]);
  assert.equal(packageJson.engines?.node, ">=20");
});

test("built CLI entrypoint is executable for npm link", async () => {
  const cli = await stat(join(process.cwd(), "dist/src/cli.js"));

  assert.notEqual(cli.mode & 0o111, 0);
});
