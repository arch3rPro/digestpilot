import { access, writeFile } from "node:fs/promises";
import type { WorkspacePaths } from "../types.js";

async function writeJsonIfMissing(path: string, value: unknown): Promise<void> {
  try {
    await access(path);
  } catch {
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }
}

export async function writeDefaultConfigs(paths: WorkspacePaths): Promise<void> {
  await writeJsonIfMissing(paths.workspaceConfigPath, {
    schema_version: 1,
    created_by: "subscription-research",
    notes_style: "standard-markdown"
  });
  await writeJsonIfMissing(paths.entitiesConfigPath, { entities: [] });
  await writeJsonIfMissing(paths.topicsConfigPath, { topics: [] });
  await writeJsonIfMissing(paths.researchRulesPath, {
    default_time_window: "7d",
    min_score: 7,
    evidence_limit: 20
  });
}
