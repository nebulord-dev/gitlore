# GITRELIC

Git archaeology — understand the history and health of your codebase.

> [!IMPORTANT]
> `gitrelic` is currently in alpha


## What it does

Run `gitrelic` in any git repository and get a narrative health report on the codebase's *history* — not just its current state.

### Churn & Complexity

- **Churn analysis** — which files change the most, and what that means
- **Churn velocity** — accelerating vs decelerating change over time
- **Hotspot scoring** — churn × LOC composite risk
- **Hotspot clustering** — multi-dimensional grouping across structural, ownership, temporal, and coupling signals
- **Complexity trend** — monthly file growth curves
- **Rewrite ratio** — insertion/deletion balance per file

### Ownership & Risk

- **Bus factor** — who owns what, where you're exposed if someone leaves
- **Knowledge concentration** — single-author file ratio across the repo
- **Ghost files** — files owned by authors who've gone inactive
- **Contributor profiles** — who built what, who's still active, who's a ghost
- **AI adoption + co-authorship** — what fraction of work is AI-assisted (Claude / Copilot / Aider / Devin / Cursor) and which humans pair-program with each other, parsed from `Co-authored-by:` trailers

### History & Patterns

- **Age map** — what's fresh, what's stale, what nobody dares touch
- **Dead code candidates** — ancient, untouched files
- **Blast radius** — how many files typically change alongside each file
- **Coupling map** — co-change frequency between file pairs
- **Parallel development** — multi-author overlap detection per week
- **Rename tracking** — file rename chain detection
- **Commit timing** — late-night and weekend stress patterns

### Diagnostics

- **Cursed files** — the intersection of all of the above: high churn + concentrated ownership + abandoned hot files, with machine-generated churn withheld
- **Shame score** — commit message forensics: files with repeated reverts, hotfixes, and hacks
- **Test coverage proxy** — test file proximity per directory
- **LOC & language breakdown** — lines of code with language detection

## Usage

```bash
# Analyze current directory
gitrelic

# Analyze a specific repo
gitrelic --path ~/projects/my-app

# Open web dashboard
gitrelic --path ~/projects/my-app --web

# Analyze only the last 6 months
gitrelic --path ~/projects/my-app --since "6 months ago"

# Output JSON for piping
gitrelic --path ~/projects/my-app --json > gitrelic-report.json

# Show commit message shame leaderboard
gitrelic --path ~/projects/my-app --shame

# Show parallel development panel
gitrelic --path ~/projects/my-app --parallel
```

## How GitRelic scores files

GitRelic uses three scoring systems, each 0–100:

### Churn score

How often a file has been modified relative to the most-committed file in the repo.
A score of 100 means this file is the most-modified file in the repo. Lower scores are proportional — a score of 50 means this file was modified half as often as the top file.

### Shame score (`--shame`)

Based on commit message sentiment. Each commit touching a file is scanned for keywords:

| Weight | Keywords |
|--------|----------|
| 3 — Critical | `revert`, `hotfix`, `oops`, `fixup`, `broke` |
| 2 — Moderate | `hack`, `workaround`, `temporary`, `temp`, `kludge`, `band-aid` |
| 1 — Mild | `fix`, `bug`, `wrong`, `mistake`, `typo`, `cleanup` |

**Shame score** = `min((total weighted points / total commits for file) × 100, 100)`

Ratio-based: a file with 1 revert in 2 commits scores higher than 1 revert in 100 commits.

### Curse score

A composite of churn, bus factor risk, abandonment, shame, and parallel development. Files
scoring ≥ 50 appear in the Cursed Files panel. Shame and parallel development each contribute
up to +20 points.

The floor of 50 sits above any single signal's maximum, so a file must trip at least two
independent analyzers to be cursed at all — a healthy repo legitimately reports none. Files
whose commits are majority bot-authored are scored, then withheld and listed separately, so
release bots churning a `CHANGELOG` don't crowd out real findings.

## Setup

```bash
pnpm install
pnpm build
cd apps/cli && pnpm link --global
```

## Architecture

pnpm monorepo + Turbo:

- `packages/core` — git analysis engine (22 analyzers covering churn, ownership, history, and diagnostics)
- `apps/cli` — Ink terminal UI + Commander
- `apps/web` — Vite + React + Tailwind dashboard (served via `--web`)

## Monorepo

```text
gitrelic/
├── packages/
│   └── core/           # Analysis engine
├── apps/
│   ├── cli/            # Terminal UI
│   └── web/            # Web dashboard
├── turbo.json
└── pnpm-workspace.yaml
```

## Contributing

PRs must use [conventional commit](https://www.conventionalcommits.org/) format in the title (e.g. `feat: add X`, `fix: resolve Y`). CI enforces this automatically.

Pre-commit hooks run oxlint and oxfmt on staged files. Releases are automated via [semantic-release](https://github.com/semantic-release/semantic-release) — version bumps, changelogs, and GitHub releases happen on merge to main.
