#!/usr/bin/env node
import { analyzeRepository } from "../src/analyzer.js";
import path from "path";

function printHelp() {
  console.log(`
🌱 greem - Developer Repository Health & Analytics CLI

Usage:
  greem [options] [path]

Options:
  -h, --help       Show CLI usage documentation
  -v, --version    Show version number
  --json           Output raw analysis report in JSON format

Examples:
  npx greem
  npx greem --json
  npx greem /path/to/repo
  `);
}

function runCLI() {
  const args = process.argv.slice(2);
  let jsonOutput = false;
  let targetPath = ".";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg === "-v" || arg === "--version") {
      console.log("greem v1.1.0");
      process.exit(0);
    } else if (arg === "--json") {
      jsonOutput = true;
    } else if (!arg.startsWith("-")) {
      targetPath = arg;
    }
  }

  try {
    const report = analyzeRepository(targetPath);

    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    console.log(`\n🌱 greem Repository Analytics — ${report.repoName}`);
    console.log(`====================================================`);
    console.log(`Path:                     ${report.repoPath}`);
    console.log(`Total Commits:            ${report.totalCommits}`);

    if (report.earliestCommit) {
      console.log(`Earliest Commit:          ${report.earliestCommit.date} (${report.earliestCommit.hash})`);
      console.log(`                          "${report.earliestCommit.subject}"`);
    }

    if (report.latestCommit) {
      console.log(`Latest Commit:            ${report.latestCommit.date} (${report.latestCommit.hash})`);
      console.log(`                          "${report.latestCommit.subject}"`);
    }

    console.log(`\nRepository Health Check:`);
    console.log(`  README:                 ${report.health.hasReadme ? "✅ Present" : "❌ Missing"}`);
    console.log(`  LICENSE:                ${report.health.hasLicense ? "✅ Present" : "❌ Missing"}`);
    console.log(`  .gitignore:             ${report.health.hasGitignore ? "✅ Present" : "❌ Missing"}`);
    console.log(`  Unit Tests:             ${report.health.hasTests ? "✅ Found" : "⚠️  No test files detected"}`);
    console.log(`  Working Tree:           ${report.health.isWorkingTreeClean ? "✅ Clean" : "⚠️  Uncommitted changes"}`);

    console.log(`\nContributors:`);
    for (const [author, count] of Object.entries(report.authorDistribution)) {
      console.log(`  - ${author}: ${count} commits`);
    }
    console.log(``);

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

runCLI();
