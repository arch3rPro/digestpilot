import { readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import type { RssRegistry, SourceHealthMap } from "./types.js";

export async function loadRssRegistry(path: string): Promise<RssRegistry> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<RssRegistry>;
  return { feeds: parsed.feeds ?? [] };
}

export async function saveRssRegistry(path: string, registry: RssRegistry): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export async function loadSourceHealth(path: string | undefined): Promise<SourceHealthMap> {
  if (!path) return {};
  try {
    return JSON.parse(await readFile(path, "utf8")) as SourceHealthMap;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}
