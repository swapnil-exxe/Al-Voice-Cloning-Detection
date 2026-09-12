# 🌱 greem — Git Repository Health & Analytics CLI

`greem` is a lightweight Node.js CLI utility for inspecting local Git repositories, evaluating codebase health metrics, and analyzing commit velocity and contributor metrics.

> **Note:** `greem` was refactored into a developer analytics tool. Contribution-generation/fake backdating scripts have been removed.

---

## Features

* 📊 **Git History Analytics:** Computes total commit count, earliest commit, latest commit, and commit messages.
* 👥 **Contributor Distribution:** Breaks down commit counts and percentages per author.
* 🛡️ **Health Audit:** Checks for `README.md`, `LICENSE`, `.gitignore`, test suites, and uncommitted working-tree changes.
* ⚙️ **JSON Output:** Export raw report object for integration into CI/CD pipelines or dashboard tooling.

---

## Installation & Setup

```bash
# Clone the repository
git clone https://github.com/swapnil-exxe/greem.git
cd greem

# Install dependencies
npm install
```

---

## Usage

Run the CLI tool against any local repository directory:

```bash
# Analyze current directory
node bin/greem.js

# Output report in JSON format
node bin/greem.js --json

# Analyze target directory
node bin/greem.js /path/to/repository
```

### CLI Options

| Flag | Long Flag | Description |
| :--- | :--- | :--- |
| `-h` | `--help` | Display CLI usage documentation |
| `-v` | `--version` | Display version number (`1.1.0`) |
| | `--json` | Output analysis report formatted as JSON |

---

## Example Output

```text
🌱 greem Repository Analytics — greem
====================================================
Path:                     /Users/swapnil/Base Zero /repos/greem
Total Commits:            470
Earliest Commit:          2026-08-22T21:12:59+05:30 (ed40a62)
                          "Initial commit"
Latest Commit:            2026-09-12T11:20:04+05:30 (5b110a3)
                          "feat: add CLI --help usage documentation and parameter flag parsing"

Repository Health Check:
  README:                 ✅ Present
  LICENSE:                ✅ Present
  .gitignore:             ✅ Present
  Unit Tests:             ✅ Found
  Working Tree:           ✅ Clean

Contributors:
  - Swapnil <swapnil.patil24@spit.ac.in>: 470 commits
```

---

## Running Unit Tests

```bash
npm test
```

---

## License

[MIT](LICENSE)
