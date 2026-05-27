import assert from "node:assert/strict";
import test from "node:test";
import { getTrendProfile, listTrendProfiles } from "../src/trends/profiles.js";

test("listTrendProfiles exposes ai-tech and product-business", () => {
  assert.deepEqual(
    listTrendProfiles().map((profile) => profile.id),
    ["ai-tech", "product-business"]
  );
});

test("getTrendProfile rejects unknown profiles", () => {
  assert.throws(() => getTrendProfile("unknown"), /Unsupported trend profile/);
});

test("profiles use different scoring emphasis", () => {
  const ai = getTrendProfile("ai-tech");
  const product = getTrendProfile("product-business");

  assert.ok(ai.weights.authority > product.weights.authority);
  assert.ok(product.weights.discussion >= ai.weights.discussion);
  assert.ok(ai.preferredSignalTypes.includes("paper"));
  assert.ok(product.preferredSignalTypes.includes("product"));
});
