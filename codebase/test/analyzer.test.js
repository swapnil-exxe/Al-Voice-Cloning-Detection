import assert from "node:assert";
import test from "node:test";
import { analyzeRepository } from "../src/analyzer.js";

test("analyzeRepository returns health and git analytics for valid repo", () => {
  const result = analyzeRepository(".");
  assert.strictEqual(typeof result.repoName, "string");
  assert.strictEqual(result.repoName, "greem");
  assert.strictEqual(typeof result.totalCommits, "number");
  assert.ok(result.totalCommits > 0);
  assert.strictEqual(typeof result.health.hasReadme, "boolean");
  assert.strictEqual(result.health.hasReadme, true);
  assert.strictEqual(result.health.hasLicense, true);
});

test("analyzeRepository throws error for non-existent directory", () => {
  assert.throws(() => {
    analyzeRepository("/non/existent/path/12345");
  }, /Directory does not exist/);
});
