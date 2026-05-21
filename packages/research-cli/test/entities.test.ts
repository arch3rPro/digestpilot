import assert from "node:assert/strict";
import test from "node:test";
import { extractEntities } from "../src/entities/extract.js";

test("extractEntities matches known entities by aliases", () => {
  const entities = extractEntities(
    {
      title: "OpenAI ships GPT-5 eval tooling",
      summary: "ChatGPT reliability updates."
    },
    {
      entities: [
        {
          id: "openai",
          name: "OpenAI",
          aliases: ["OpenAI", "ChatGPT", "GPT-5"],
          type: "company",
          tags: ["ai"]
        }
      ]
    }
  );

  assert.equal(entities[0].id, "openai");
  assert.equal(entities[0].confidence, "high");
  assert.equal(entities[0].source, "config");
});

test("extractEntities returns rule candidates", () => {
  const entities = extractEntities(
    {
      title: "LangGraph adds MCP support",
      summary: "New Agent SDK examples."
    },
    { entities: [] }
  );

  assert.ok(entities.some((entity) => entity.name === "LangGraph" && entity.source === "rule"));
  assert.ok(entities.some((entity) => entity.name === "MCP" && entity.source === "rule"));
});

test("extractEntities filters URL fragments and date-like candidates", () => {
  const entities = extractEntities(
    {
      title: "Gemini 3 adds Antigravity CLI",
      summary: "See com/google-gemini and net/tags from May/19 in 2026."
    },
    { entities: [] }
  );
  const names = entities.map((entity) => entity.name);

  assert.ok(names.includes("Gemini 3"));
  assert.ok(names.includes("Antigravity CLI"));
  assert.equal(names.includes("com/google-gemini"), false);
  assert.equal(names.includes("net/tags"), false);
  assert.equal(names.includes("May/19"), false);
  assert.equal(names.includes("2026"), false);
});
