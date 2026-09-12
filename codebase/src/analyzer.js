import { execSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Analyzes a local Git repository and produces engineering health & velocity statistics.
 * @param {string} targetDir Absolute or relative path to target Git repository directory.
 * @returns {object} Analysis report object.
 */
export function analyzeRepository(targetDir = ".") {
  const absPath = path.resolve(targetDir);
  const gitDir = path.join(absPath, ".git");

  if (!fs.existsSync(absPath)) {
    throw new Error(`Directory does not exist: ${absPath}`);
  }

  if (!fs.existsSync(gitDir)) {
    throw new Error(`Not a git repository (missing .git): ${absPath}`);
  }

  const repoName = path.basename(absPath);

  // Exec helper with silent fallback
  const runGit = (args) => {
    try {
      return execSync(`git ${args}`, { cwd: absPath, encoding: "utf-8" }).trim();
    } catch {
      return "";
    }
  };

  // Commit count
  const commitCountStr = runGit("rev-list --count HEAD");
  const totalCommits = parseInt(commitCountStr, 10) || 0;

  // Earliest commit
  let earliestCommit = null;
  if (totalCommits > 0) {
    const rawEarliest = runGit("log --reverse --format=\"%H|%an|%ae|%aI|%s\" -n 1");
    if (rawEarliest) {
      const [hash, author, email, date, subject] = rawEarliest.split("|");
      earliestCommit = { hash: hash?.slice(0, 7), author, email, date, subject };
    }
  }

  // Latest commit
  let latestCommit = null;
  if (totalCommits > 0) {
    const rawLatest = runGit("log -n 1 --format=\"%H|%an|%ae|%aI|%s\"");
    if (rawLatest) {
      const [hash, author, email, date, subject] = rawLatest.split("|");
      latestCommit = { hash: hash?.slice(0, 7), author, email, date, subject };
    }
  }

  // Author breakdown
  const authorMap = {};
  if (totalCommits > 0) {
    const authorsRaw = runGit("log --format=\"%an <%ae>\"");
    if (authorsRaw) {
      const lines = authorsRaw.split("\n").filter(Boolean);
      for (const author of lines) {
        authorMap[author] = (authorMap[author] || 0) + 1;
      }
    }
  }

  // Repository Health Indicators
  const hasReadme = fs.existsSync(path.join(absPath, "README.md")) || fs.existsSync(path.join(absPath, "readme.md"));
  const hasLicense = fs.existsSync(path.join(absPath, "LICENSE")) || fs.existsSync(path.join(absPath, "LICENSE.md"));
  const hasGitignore = fs.existsSync(path.join(absPath, ".gitignore"));
  
  const statusStr = runGit("status --short");
  const isWorkingTreeClean = statusStr === "";

  // Check for test files
  let hasTests = false;
  const walkDir = (dir) => {
    if (hasTests) return;
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (item === "node_modules" || item === ".git" || item === "dist") continue;
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (item.includes("test") || item.includes("spec")) {
          hasTests = true;
          return;
        }
      }
    } catch {}
  };
  walkDir(absPath);

  return {
    repoName,
    repoPath: absPath,
    totalCommits,
    earliestCommit,
    latestCommit,
    authorDistribution: authorMap,
    health: {
      hasReadme,
      hasLicense,
      hasGitignore,
      hasTests,
      isWorkingTreeClean
    }
  };
}
