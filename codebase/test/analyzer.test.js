import assert from "node:assert";
import test from "node:test";
import { analyzeRepository } from "../src/analyzer.js";

test("analyzeRepository returns health and git analytics for valid repo", () => {
  const result = analyzeRepository(".");
  assert.strictEqual(typeof result.repoName, "string");
  assert.ok(result.repoName.length > 0);
  assert.strictEqual(typeof result.totalCommits, "number");
  assert.ok(result.totalCommits > 0);
  assert.strictEqual(typeof result.health.hasReadme, "boolean");
});

test("analyzeRepository throws error for non-existent directory", () => {
  assert.throws(() => {
    analyzeRepository("/non/existent/path/12345");
  }, /Directory does not exist/);
});
