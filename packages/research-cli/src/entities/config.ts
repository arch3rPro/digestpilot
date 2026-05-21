import { readFile } from "node:fs/promises";

export interface EntityConfig {
  entities: KnownEntity[];
}

export interface KnownEntity {
  id: string;
  name: string;
  aliases: string[];
  type: string;
  tags?: string[];
}

export interface ExtractedEntity {
  id?: string;
  name: string;
  type: string;
  confidence: "high" | "medium";
  source: "config" | "rule";
  matchText: string;
}

export async function loadEntityConfig(path: string): Promise<EntityConfig> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<EntityConfig>;
    return {
      entities: Array.isArray(parsed.entities) ? parsed.entities.map(normalizeKnownEntity).filter(Boolean) : []
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { entities: [] };
    }
    throw error;
  }
}

function normalizeKnownEntity(entity: KnownEntity): KnownEntity {
  return {
    id: String(entity.id),
    name: String(entity.name),
    aliases: Array.isArray(entity.aliases) ? entity.aliases.map(String) : [String(entity.name)],
    type: String(entity.type || "unknown"),
    tags: Array.isArray(entity.tags) ? entity.tags.map(String) : []
  };
}
