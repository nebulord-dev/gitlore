# GitRelic — Claude Code Guide

## Project Overview

**GitRelic** is a git archaeology CLI. It analyzes a git repository's _history_ to surface churn patterns, bus factor risks, file age, contributor profiles, and "cursed files" — files at the intersection of high churn, concentrated ownership, and age anomalies.

## Monorepo Architecture

pnpm workspace + Turbo. Strict dependency order:

```
@gitrelic/core (foundation — private)
    ↓
gitrelic              (CLI, the only published package; bundles core inline)
@gitrelic/web         (browser dashboard; served by CLI --web flag)
@gitrelic/docs        (VitePress site; deploys separately via .github/workflows/docs.yml)
```

Workspace names in `pnpm --filter <n>` commands: `@gitrelic/core`, `gitrelic` (NOT `@gitrelic/cli`), `@gitrelic/web`, `@gitrelic/docs`.

## Package Breakdown

### `packages/core` — Analysis Engine

- `src/runner.ts` — orchestrates all analyzers, entry point is `runGitrelic()`
- `src/types.ts` — all TypeScript interfaces (`GitrelicReport`, `ChurnReport`, etc.)
- `src/utils/git.ts` — raw git primitives (parsing `git log`, `git ls-files`, `Co-authored-by` trailers via git's native trailer parser into `RawCommit.coAuthors`)
- `src/utils/authorClassification.ts` — pure-function AI/bot/human classifier (Claude / Copilot / Aider / Devin / Cursor + dependabot / renovate / semantic-release / github-actions). Shared infrastructure; co-author consumes today, Contributors will adopt for bot filtering later.
- `src/analyzers/` — 22 analyzers, each with a corresponding `.test.ts`:
  - `churn.ts` — file churn frequency analysis
  - `bus-factor.ts` — ownership concentration per file
  - `age-map.ts` — last-commit age per file
  - `contributors.ts` — per-author stats and profiles
  - `cursed-files.ts` — cross-analyzer risk scoring
  - `forensics.ts` — commit message shame scoring
  - `parallel-dev.ts` — multi-author overlap detection per week
  - `loc.ts` — lines of code + language breakdown
  - `hotspot.ts` — churn × LOC composite scoring
  - `coupling.ts` — co-change frequency between file pairs
  - `churn-velocity.ts` — accelerating vs decelerating churn
  - `rewrite-ratio.ts` — insertion/deletion balance
  - `blast-radius.ts` — co-changed file count per commit
  - `dead-code.ts` — ancient + untouched file candidates
  - `test-coverage.ts` — test file proximity proxy
  - `ghost-files.ts` — files owned by inactive authors
  - `knowledge-concentration.ts` — single-author file ratio
  - `co-author.ts` — AI adoption + human pair-programming attribution from `Co-authored-by:` trailers
  - `hotspot-clustering.ts` — multi-dimensional hotspot grouping
  - `complexity-trend.ts` — monthly file growth curves
  - `commit-timing.ts` — late-night/weekend stress patterns
  - `rename-tracking.ts` — file rename chain detection

### `apps/cli` — Terminal Interface (published as `gitrelic` on npm)

- `src/index.tsx` — Commander entry, Ink render, `--web` server
- `src/components/App.tsx` — root Ink component (loading → results)
- `scripts/copy-web-dist.mjs` — tsdown `onSuccess` hook: copies `apps/web/dist/*` → `apps/cli/dist/web/*` so the dashboard ships inside the published tarball
- `tsdown.config.ts` — `deps.alwaysBundle: ['@gitrelic/core']` inlines core's source into the CLI bundle (core stays private)

### `apps/web` — Web Dashboard

- `src/App.tsx` — loads `/gitrelic-report.json`, normalizes missing fields via `utils/normalizeReport.ts`, then renders `Shell`
- `src/utils/normalizeReport.ts` — fills empty defaults for analyzer fields missing from older reports so tabs don't crash
- `src/components/layout/Shell.tsx` — top-level layout (sidebar + top bar + main pane + bottom panel + inspector)
- `src/components/layout/Sidebar.tsx` — left nav, switches between overview and tab modes
- `src/components/layout/BottomPanel.tsx` — routes to the 22 tab components under `components/tabs/`
- `src/components/layout/InspectorPanel.tsx` — drill-down panel for the selected file/contributor/activity
- `src/components/hero/` — D3 visualizations (commit graph, swimlanes, treemaps, force graphs, etc.). Biggest XSS surface — must only use `.text()`, never `.html()`
- `src/components/tabs/` — 22 deep-dive tabs, one per analyzer
- Critical rule: only `import type` from `@gitrelic/core`. Value imports bundle Node.js modules into the browser build and break Vite.
- **Styling:** Tailwind v4 only — see [Web Styling](#web-styling) section below.

### `apps/docs` — VitePress Documentation Site

- `.vitepress/config.ts` — site config, base `/gitrelic/`
- `guide/`, `analyzers/`, `dashboard/`, `advanced/` — content
- Deployed to `nebulord-dev.github.io/gitrelic` via `.github/workflows/docs.yml` on `apps/docs/**` changes to `main`
- **Excluded from root `pnpm build`** — docs has its own deploy workflow. `pnpm docs:dev` / `pnpm docs:build` to work locally.


## IMPORTANT

Add tests to all changes that can benefit from tests.  If a test is deemed not needed, explain why.

## Key Concepts

### Report flow

1. `runGitrelic()` in core runs all analyzers
2. CLI receives `GitrelicReport` and renders Ink UI
3. With `--web`: CLI starts HTTP server (dynamic port via `getFreePort`, preferred 7777), serves web/dist + `/gitrelic-report.json`

### Adding a new analyzer

1. Create `packages/core/src/analyzers/my-analyzer.ts`
2. Export a function `analyzeX(commits, trackedFiles): XReport`
3. Add result to `GitrelicReport` in `types.ts`
4. Call it in `runner.ts` and include in return value

### Architectural review

After cross-package changes (new analyzers, new web visualizations, refactors touching multiple packages), invoke the **monorepo-architect** agent (`.claude/agents/monorepo-architect.md`) to validate:

- Dependency direction (core → cli/web, never the reverse)
- Web imports from core are `import type` only (no value imports — they'd bundle Node.js into the browser)
- Git commands are centralized in `utils/git.ts`, not scattered in analyzers (exec-discipline)
- New analyzers are wired into `runner.ts`, typed in `types.ts`, and exported from `index.ts`

### Audit skills

For deeper, package-scoped audits use the `audit-*` skills under `.claude/skills/`. Each one has a targeted checklist and dispatches an appropriate reviewer agent:

- `audit-architecture` — monorepo boundaries, publishing invariant, exec discipline, dependency direction
- `audit-core` — analyzer correctness, runner orchestration, edge cases, cross-platform paths
- `audit-cli` — packaging, Commander flag validation, web server security, Ink patterns
- `audit-web` — import discipline, D3 XSS surface, report loading, large-report performance

Run these before merging large feature branches or when onboarding to a specific package. The `exec-discipline` skill documents the rule that all git subprocess calls must live in `utils/git.ts`.

### Data source

Everything comes from `git log` and `git ls-files`. No external tool dependencies — pure git.

### Publishing invariants

The published `gitrelic` package relies on two invariants that CI enforces. Both are load-bearing — break either one and `npm install gitrelic` crashes at runtime.

1. **Bundled-deps mirror.** `apps/cli/tsdown.config.ts` inlines `@gitrelic/core`'s source via `deps.alwaysBundle`. The bundled code still calls `require('execa')` (and anything else core declares) against the CLI's own `node_modules` — so every runtime dep in `packages/core/package.json` MUST also appear in `apps/cli/package.json` with matching version ranges. The `install-smoke` CI job diffs the two dependency lists and fails on drift.

2. **Published-asset mirror.** `apps/cli/package.json` ships `files: ["dist"]`, so only `dist/` lands in the tarball. The web dashboard lives at `apps/web/dist/`, outside the tarball — `scripts/copy-web-dist.mjs` (run as tsdown `onSuccess`) copies it into `apps/cli/dist/web/` at build time. Without this, `--web` crashes with `ENOENT` on every published version. Turbo orders the web build first because `apps/cli/package.json` declares `@gitrelic/web` as a `devDependency: workspace:*`.

Changes to either side (new core dep, removed core dep, web dist layout change) must keep both invariants intact in the same PR.

## Issue tracking

Issues live in Linear under the GitRelic team. The team backlog is hand-ordered
— top of the list is the next thing to work on. When asked "what's next" or
"pick up the next issue," look at the GitRelic backlog (sorted by manual order,
not priority or date) and start with the topmost issue in Todo state.

### Polish Initiative

Issues prefixed `Polish: <analyzer>` belong to the Polish Initiative — a forensic pass
to optimize each analyzer's hero graphs and bottom panels. Before working on any
Polish ticket, read `docs/polish-pattern.md` — it maps each analyzer to its decided
bottom-panel form (narrative-KPI, table, etc.) and lists per-analyzer specs. Update
the doc when a polish ticket discovers the spec is wrong or when a new pattern emerges.

## Build Commands

```bash
pnpm build                          # core + cli + web (apps/docs excluded)
pnpm --filter @gitrelic/core build
pnpm --filter gitrelic build        # NOT @gitrelic/cli — published package is unscoped
pnpm --filter @gitrelic/web build
pnpm docs:build                     # apps/docs (VitePress) — separate from pnpm build
pnpm dev                            # watch all
```

TypeScript 6 throughout (`tsconfig.base.json` + `pnpm-workspace.yaml` catalog). tsdown bundles core and CLI; Vite bundles web; VitePress bundles docs.

## Linting & Formatting

oxlint + oxfmt (not ESLint/Prettier). Config at root: `oxlint.config.ts`, `.oxfmtrc.json`.

```bash
pnpm lint                           # run oxlint
pnpm lint:fix                       # auto-fix lint issues
pnpm format                         # format all files with oxfmt
pnpm format:check                   # check formatting without writing
```

Pre-commit hook (husky + lint-staged) runs `oxlint --fix` and `oxfmt` on staged files automatically.

## Testing

```bash
pnpm test                           # run all tests (231 core + 29 web)
pnpm test:core                      # core package tests with Vitest UI
pnpm test:web                       # web package tests with Vitest UI
pnpm test:coverage                  # coverage report
```

## Running Locally

```bash
node apps/cli/dist/index.mjs --path ~/path/to/any-git-repo
node apps/cli/dist/index.mjs --path ~/path/to/any-git-repo --web
node apps/cli/dist/index.mjs --path ~/path/to/any-git-repo --json
```

The built output is `dist/index.mjs` (matches `apps/cli/package.json` `bin` field). To verify the published layout, pack the tarball: `cd apps/cli && pnpm pack && tar -tzf gitrelic-*.tgz`.

## Dependency Hygiene

GitRelic has three dependency surfaces and each is scanned / updated differently:

1. **Per-package `dependencies` / `devDependencies`** in `packages/core`, `apps/cli`, `apps/web`, `apps/docs`
2. **Workspace catalog** in `pnpm-workspace.yaml` (shared `typescript`, `tsdown`, `vitest`, `@types/*`, etc.)
3. **pnpm overrides** in root `package.json` (narrow pins for security / compat — e.g. `vitepress>vite`)

### `pnpm outdated` vs `taze`

They answer different questions — use both.

- **`pnpm -r outdated`** — "Is my **installed** version behind the latest?" Reads the lockfile. Reports nothing if your declared range (e.g. `^9.5.2`) already resolves to the current latest (`9.6.1`). Great for catching real upgrades available without range-bumping.
- **`pnpm dlx taze -r`** — "Is my **declared range** behind the latest?" Reads `package.json`. Flags `^9.5.2` even if the resolved install is already `9.6.1`, because the floor of the range is stale. Also understands catalog entries. Runs with `npx taze -r` too.

Both tools together give the full picture. Taze also has a known parse error on pnpm's range-selector override keys (`picomatch@>=4.0.0 <4.0.4`) — harmless, the report above the error is complete.

### Bumping

```bash
pnpm -r update --latest <pkg>        # rewrites package.json ranges AND lockfile (-L short form)
pnpm -r up -L --interactive          # pick-list — use this for anything majorish
```

- `pnpm update` (no `--latest`) only refreshes within the existing range — it won't raise the declared floor
- `pnpm -r up -L` does NOT touch the workspace catalog; bump `pnpm-workspace.yaml` by hand (or use taze)
- Overrides in root `package.json` are also invisible to `pnpm update` — edit directly

### Bundled-deps mirror discipline

When bumping any runtime dep in `packages/core`, bump the matching entry in `apps/cli/package.json` in the **same commit**. The `install-smoke` CI only checks that keys match, not versions — so two declarations can drift to different ranges while CI stays green, and a future fresh install could resolve them differently.

`pnpm -r up -L <pkg>` handles this automatically when both packages declare the dep (common case: `execa`).

### Why `vitepress>vite` is pinned to vite 6

That override is **scoped** — it only pins vite **where vitepress depends on it**, not the top-level vite used by `apps/web`. VitePress 1.x was built against vite 6; vite 7+ has breaking changes VitePress 1.x never absorbed. The lockfile happily holds both `vite@6.4.x` (inside vitepress) and `vite@8.x` (for `apps/web`). Taze will flag the top-level vite range even though the override pins a different vite instance to 6 — that's not drift, it's two separate vites in the graph. Drop the override only when moving to VitePress 2.x (which supports vite 7+).

The heading deliberately says "vite 6" rather than a patch version — the pin gets bumped on every vite 6 security patch, and a version in the heading goes stale immediately.

### Security overrides

`package.json` is JSON and can't hold comments, so the advisory backing each security override is recorded here. Without this table nobody can tell whether a boundary is correct, or when a pin becomes safe to drop.

| Override | Advisories | Drop when |
| --- | --- | --- |
| `ws@>=8.0.0 <8.21.0` | GHSA-96hv-2xvq-fx4p, GHSA-58qx-3vcg-4xpx | `ink` ships a release resolving ws ≥ 8.21.0 |
| `undici@>=6.0.0 <6.28.0` | GHSA-8xcm-r25x-g524, GHSA-m8rv-5g2x-5cg5, GHSA-v3r7-h72x-cjcm, GHSA-35p6-xmwp-9g52, GHSA-g8m3-5g58-fq7m, GHSA-p88m-4jfj-68fv | `semantic-release` → `@actions/core` drops undici 6 |
| `undici@>=7.0.0 <7.29.0` | GHSA-4cwx-7wf7-3272, GHSA-jr45-8vmc-qm54, GHSA-hm92-r4w5-c3mj, GHSA-vmh5-mc38-953g, GHSA-pr7r-676h-xcf6 | `@semantic-release/github` requires undici ≥ 7.29.0 |
| `js-yaml@>=4.0.0 <4.3.1` | GHSA-5p4m-2wfm-xmqj, GHSA-52cp-r559-cp3m, GHSA-h67p-54hq-rp68 | `cosmiconfig` requires js-yaml ≥ 4.3.1 |
| `postcss@>=8.0.0 <8.5.23` | GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849 | vitepress/vue toolchain resolves postcss ≥ 8.5.23 |
| `dompurify@>=3.0.0 <3.4.13` | GHSA-55q2-fjhq-7xh7, GHSA-c2j3-45gr-mqc4 | `mermaid` requires dompurify ≥ 3.4.13 |
| `esbuild@>=0.27.3 <0.28.1` | GHSA-g7r4-m6w7-qqqr | nothing in the tree can match the selector (see below) |
| `vitepress>vite` | GHSA-fx2h-pf6j-xcff, GHSA-v6wh-96g9-6wx3 | moving to VitePress 2.x |

**Always bound the lower end at the major.** Write `ws@>=8.0.0 <8.21.0`, never `ws@<8.21.0`. A bare `<X` selector also matches every earlier major, so the override would silently force a major upgrade on any future transitive that pulls an older line — a breaking change disguised as a security pin. Nothing in the tree triggers it today, which is exactly why it would be missed. The `postcss` and `dompurify` entries are narrowed to the 8.x / 3.x lines for this reason even though their advisories nominally cover everything below the patched version.

**The `esbuild` override is a tripwire, not an upgrade.** esbuild is an *optional* `peerDependency` of vite 8, and vite 8 bundles rolldown as its actual bundler — it never calls esbuild. Narrowing the peer range caused pnpm to **drop** esbuild and its 26 `@esbuild/*` platform packages from the vite 8 subtree rather than install 0.28.1. That's the desired outcome (the vulnerable copy is gone, builds verified green), but it means no esbuild in the tree matches the selector anymore. Leave it in place as a guard against a future dep reintroducing a 0.27.x. The separate `esbuild@<0.25.0` floor and the surviving `esbuild@0.25.12` under vite 6 are unrelated and not vulnerable — GHSA-g7r4-m6w7-qqqr starts at 0.27.3.

Regenerate this table from the live feed with:

```bash
gh api repos/nebulord-dev/gitrelic/dependabot/alerts --paginate \
  -q '.[] | select(.state=="open") | "\(.dependency.package.name)\t\(.security_advisory.ghsa_id)\t\(.security_vulnerability.vulnerable_version_range)"' | sort -u
```

## Releases & Versioning

Releases are automated by semantic-release on push to `main` (see `.releaserc.json` and `.github/workflows/publish.yml`). The published package is `gitrelic` on npm (`apps/cli` is `pkgRoot`).

**Pre-1.0 guard:** GitRelic is in pre-alpha and must stay on 0.x. `.releaserc.json` contains a `releaseRules` override on `@semantic-release/commit-analyzer` that reclassifies breaking changes as a **minor** bump instead of major:

```json
["@semantic-release/commit-analyzer", {
  "releaseRules": [
    { "breaking": true, "release": "minor" }
  ]
}]
```

Effect during pre-1.0:

- `fix:` → patch (0.1.0 → 0.1.1)
- `feat:` → minor (0.1.0 → 0.2.0)
- `feat!:` / `chore!:` / `BREAKING CHANGE:` → **minor** (0.1.0 → 0.2.0), not major

**Do not remove this rule casually.** It exists because a single `chore!:` commit (the gitlore→gitrelic rename) once caused semantic-release to jump straight to `v2.0.0`, which had to be unpublished and reset. Remove it only when intentionally cutting `1.0.0`, and do so in the same PR that marks the 1.0 release.

## Web Styling

`apps/web` uses Tailwind v4 for all styling. Inline `style={{}}` on JSX is reserved for runtime/data-driven values only — static styling lives in className via Tailwind utilities.

### Composition primitives

- `cn()` from `apps/web/src/utils/cn.ts` (clsx + tailwind-merge) — use only for runtime conditionals or spread-merges. **Bare ternary** for single conditionals (`className={cond ? 'a' : 'b'}`, NOT `cn(cond ? 'a' : 'b')`). Even with shared base classes, prefer the bare-ternary form (`className={cond ? 'base a' : 'base b'}`) over `cn('base', cond ? 'a' : 'b')` — established precedent through PR3c heroes and PR4 tabs.
- `classMaps.ts` from `apps/web/src/utils/classMaps.ts` — typed tier→class lookups for severity/accent/domain colors. Don't compose color classes by template-stringing tier names (`text-severity-${tier}`) — bypasses the type system, grep-hostile.

```tsx
import { cn } from '../../utils/cn';
import { severityText } from '../../utils/classMaps';

<div className={cn('flex gap-2', isActive && 'border-border-focus')} />
<span className={severityText[variant]}>...</span>
```

### Theme bridge

CSS variables in `apps/web/src/index.css` are the source of truth for colors and other theme values. A `@theme` block aliases them to Tailwind tokens (`bg-surface-primary`, `text-severity-critical`, `bg-tooltip-bg`, etc.). Light/dark is designed to switch via `[data-theme='light']` on `<html>`, but the toggle is currently disabled in `TopBar.tsx` pending full hero/graph coverage — dark is the active default. **Don't introduce `dark:` variants** — they fight the existing system. **Don't migrate `index.css` to Tailwind primitives** (`@apply`, `@layer components`) — the CSS variable token system is good as CSS.

Available token domains:
- `bg-surface-*` / `border-border-*` / `text-text-*` (UI chrome)
- `bg-severity-{critical,warning,moderate,healthy}-{bg,text}` + `text-severity-{critical,warning,moderate,healthy}` foreground only
- `stale` is a `BadgeVariant` but resolves to `bg-surface-tertiary text-text-tertiary` via `classMaps.ts` (no dedicated severity token)
- `bg-accent-{ownership,coupling,temporal}-{bg,text}` + `text-accent-{ownership,coupling,temporal}` foreground only
- `bg-accent-primary` / `text-accent-primary` (bare — no `-bg`/`-text` variants)
- `bg-tooltip-bg` / `text-tooltip-text` (tooltip-specific token pair — distinct from `bg-surface-elevated` which is for general elevated surfaces)

### Cookbook rules

These rules were established through the RELIC-336 migration (PR1–PR4) and are the result of multiple PR review cycles. Following them up-front avoids fixup commits.

**1. Carve-outs are for runtime values only.** A `style={{}}` block is only justified when the value depends on data, mouse coords, or other per-render state. Static module-level constants (`const ROW_HEIGHT = 40`) are NOT carve-out candidates — they're `className="h-10"` (or `className="h-[Npx]"` if off-scale).

**2. Standard Tailwind scale before arbitrary values.** Spacing/widths half-step scale: 0/0.5/1/1.5/2/2.5/3/3.5/4/5/6/8/10/12 = 0/2/4/6/8/10/12/14/16/20/24/32/40/48 px. So:
- `py-1.5` (6px), NOT `py-[6px]`
- `px-2.5` (10px), NOT `px-[10px]`
- `gap-1.5` (6px), NOT `gap-[6px]`
- `max-w-80` (320px), NOT `max-w-[320px]`

Type sizes don't have half-step scale — `text-[10px]`, `text-[11px]`, `text-[9px]` are correct (they're between standard `text-xs`=12px and below). Genuinely off-scale values (5px, 7px, 11px, 13px, 22px, 50px, 130px, 250px, 300px, 350px) use arbitrary `[Npx]` syntax.

**3. Border radius mapping:** `borderRadius: 4` → `rounded` (4px). `borderRadius: 2` → `rounded-xs` (2px). Don't confuse them.

**4. Tooltip styling:** use `bg-tooltip-bg text-tooltip-text` token pair (NOT `bg-surface-elevated`/`text-text-primary` — those are surface tokens, render slightly different in light/dark themes).

**5. SVG-specific rules:**
- Static `style` props on JSX `<rect>`/`<g>`/`<text>` migrate to `className=` (Tailwind utilities work on inline SVG).
- D3 `.attr('fill', ...)` and `.style('fill', ...)` calls inside `useEffect`/`useMemo` are NOT React style props — leave alone.
- `<g transform={...}>` is a JSX attribute, not a React `style` prop — never migrate.

### When carve-outs are correct

- Tooltip dynamic position (`style={{ left: tooltip.x, top: tooltip.y }}`)
- Data-driven backgrounds (`style={{ background: bubbleColor(author) }}`)
- D3 scale outputs (`style={{ left: xScale(d.date) }}`)
- Untokenizable rgba opacity variants (`style={{ color: 'rgba(248,81,73,0.8)' }}` — when no theme token resolves to that exact value)
- Per-row dynamic positioning computed from index/data (`style={{ top: i * rowHeight }}`)
- Runtime percentage bar widths (`style={{ width: \`${percentage}%\` }}`)

### Patterns and primitives to look at

- `apps/web/src/components/shared/NarrativeKPI.tsx` — canary component, foundation reference
- `apps/web/src/components/shared/Tooltip.tsx` — tooltip primitive with `wrapperClassName` API for layout customization
- `apps/web/src/components/shared/Badge.tsx` — uses `badgeClasses` from `classMaps.ts`
- `apps/web/src/utils/classMaps.ts` — typed tier→class registry

### Don't

- Add `dark:` variants — fight the `[data-theme]` system.
- Migrate `index.css` to `@apply` / `@layer components`.
- Add `class-variance-authority` or similar.
- Compose color classes via template strings (`text-severity-${tier}`).
- Mass-disable lint rules with file-level `/* oxlint-disable */` for migration shortcuts.
