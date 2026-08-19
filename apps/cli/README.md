# Gitrelic

Git archaeology — surface churn patterns, bus factor risks, hotspots, and cursed files from your repo's git history.

Built on the methodology from Adam Tornhill's *Your Code as a Crime Scene* and *Software Design X-Rays*. Zero external dependencies — everything comes from `git log` and `git ls-files`.

## Install

```bash
# npx
npx gitrelic --web

# global
npm install -g gitrelic
```

## Quick Start

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
gitrelic --path ~/projects/my-app --json > report.json
```

## What You Get

### Churn & Complexity
Churn analysis, churn velocity, hotspot scoring and clustering, complexity trends, and rewrite ratios.

### Ownership & Risk
Bus factor, knowledge concentration, ghost files (owned by inactive authors), contributor profiles, and AI-adoption + human pair-programming attribution from `Co-authored-by:` trailers.

### History & Patterns
Age maps, dead code candidates, blast radius, coupling maps, parallel development detection, rename tracking, and commit timing stress patterns.

### Diagnostics
Cursed files (high churn + concentrated ownership + abandonment, excluding bot-generated churn), shame scores (commit message forensics), test coverage proximity, and LOC/language breakdown.

## 22 Analyzers

All analysis comes from pure git history — no language-specific tooling, no external wrappers.

## Terminal & Web

Rich Ink-powered terminal UI for quick scans, plus a full web dashboard with hero visualizations and 23 deep-dive tabs via `--web`.

## Documentation

Full docs at [nebulord-dev.github.io/gitrelic](https://nebulord-dev.github.io/gitrelic/)

## License

MIT
