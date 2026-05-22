import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import type { RssEntry, SeenState } from "./types.js";

export async function loadSeenState(path: string): Promise<SeenState> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<SeenState>;
    return { seen: parsed.seen ?? {} };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { seen: {} };
    throw error;
  }
}

export async function saveSeenState(path: string, state: SeenState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function entryKey(entry: RssEntry): string {
  let basis: string;
  if (entry.link) {
    basis = `link:${entry.link}`;
  } else if (entry.guid) {
    basis = `guid:${entry.feed_id ?? ""}:${entry.guid}`;
  } else {
    basis = `title:${entry.feed_id ?? ""}:${(entry.title ?? "").toLowerCase()}:${entry.published_at ?? ""}`;
  }
  return createHash("sha256").update(basis).digest("hex");
}

export function isSeen(state: SeenState, entry: RssEntry): boolean {
  return entryKey(entry) in state.seen;
}

export function markSeen(state: SeenState, entries: RssEntry[], now = new Date()): void {
  const firstSeenAt = now.toISOString();
  for (const entry of entries) {
    const key = entryKey(entry);
    state.seen[key] ??= {
      first_seen_at: firstSeenAt,
      feed_id: entry.feed_id ?? "",
      title: entry.title ?? ""
    };
  }
}
