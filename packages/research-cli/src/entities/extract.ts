import type { EntityConfig, ExtractedEntity } from "./config.js";

export interface EntityInput {
  title?: string;
  summary?: string;
}

export function extractEntities(input: EntityInput, config: EntityConfig): ExtractedEntity[] {
  const text = `${input.title || ""} ${input.summary || ""}`;
  const results = new Map<string, ExtractedEntity>();

  for (const entity of config.entities) {
    for (const alias of entity.aliases) {
      if (containsPhrase(text, alias)) {
        results.set(entity.id, {
          id: entity.id,
          name: entity.name,
          type: entity.type,
          confidence: "high",
          source: "config",
          matchText: alias
        });
        break;
      }
    }
  }

  for (const candidate of extractCandidateNames(text)) {
    const alreadyKnown = Array.from(results.values()).some(
      (entity) => entity.name === candidate || entity.matchText === candidate
    );
    if (!alreadyKnown) {
      results.set(`candidate:${candidate}`, {
        name: candidate,
        type: "candidate",
        confidence: "medium",
        source: "rule",
        matchText: candidate
      });
    }
  }

  return Array.from(results.values());
}

function containsPhrase(text: string, phrase: string): boolean {
  if (!phrase.trim()) return false;
  return text.toLowerCase().includes(phrase.toLowerCase());
}

function extractCandidateNames(text: string): string[] {
  const candidates = new Set<string>();
  const patterns = [
    /\b[A-Z]{2,}(?:-[0-9]+)?\b/g,
    /\b[A-Z][a-z]+(?:[A-Z][a-z0-9]+)+\b/g,
    /\b[A-Z][A-Za-z]+(?:\s+[0-9]+)\b/g,
    /\b[a-z0-9-]+\/[a-z0-9._-]+\b/gi,
    /\b[A-Za-z0-9.-]+(?:\s+SDK|\s+API|\s+CLI|\s+Agent|\s+DB)\b/g
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      candidates.add(match[0]);
    }
  }
  return Array.from(candidates).sort();
}
