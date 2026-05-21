import { mkdir } from "node:fs/promises";
import { writeDefaultConfigs } from "../workspace/config.js";
import { openResearchDb } from "../workspace/db.js";
import { getWorkspacePaths, workspaceDirectories } from "../workspace/paths.js";
import { applySchema } from "../workspace/schema.js";

export interface InitOptions {
  workspace: string;
}

export async function initWorkspace(options: InitOptions): Promise<void> {
  const paths = getWorkspacePaths(options.workspace);

  for (const directory of workspaceDirectories(paths)) {
    await mkdir(directory, { recursive: true });
  }

  await writeDefaultConfigs(paths);

  const db = openResearchDb(paths.databasePath);
  try {
    applySchema(db);
  } finally {
    db.close();
  }
}
