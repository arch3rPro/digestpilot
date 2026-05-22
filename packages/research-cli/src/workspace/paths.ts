import { join, resolve } from "node:path";
import type { WorkspacePaths } from "../types.js";

export function getWorkspacePaths(workspace: string): WorkspacePaths {
  const root = resolve(workspace);
  const dataDir = join(root, "data");
  const notesDir = join(root, "notes");
  const exportsDir = join(root, "exports");
  const configDir = join(root, "config");

  return {
    root,
    dataDir,
    notesDir,
    briefsDir: join(notesDir, "briefs"),
    dailyDir: join(notesDir, "daily"),
    exportsDir,
    jsonExportsDir: join(exportsDir, "json"),
    configDir,
    databasePath: join(dataDir, "research.db"),
    articlesJsonlPath: join(dataDir, "articles.jsonl"),
    sourcesJsonPath: join(dataDir, "sources.json"),
    sourceHealthPath: join(dataDir, "source-health.json"),
    contentCacheDir: join(dataDir, "content-cache"),
    seenPath: join(dataDir, "seen.json"),
    workspaceConfigPath: join(configDir, "workspace.json"),
    entitiesConfigPath: join(configDir, "entities.json"),
    topicsConfigPath: join(configDir, "topics.json"),
    researchRulesPath: join(configDir, "research-rules.json")
  };
}

export function workspaceDirectories(paths: WorkspacePaths): string[] {
  return [
    paths.dataDir,
    paths.contentCacheDir,
    paths.briefsDir,
    paths.dailyDir,
    join(paths.notesDir, "weekly"),
    join(paths.notesDir, "topics"),
    join(paths.notesDir, "entities"),
    join(paths.notesDir, "memos"),
    join(paths.exportsDir, "markdown"),
    paths.jsonExportsDir,
    join(paths.exportsDir, "opml"),
    paths.configDir
  ];
}
