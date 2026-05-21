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
