# Bottom-Panel Pattern (Polish Initiative)

> **Scope:** Internal design doc for the Polish Initiative ([Linear project](https://linear.app/nebulord/project/polish-initiative-8fcf94923771)). Read this before polishing any analyzer's tab.

## How to read this doc

**This is a high-level overview, not a binding spec.** Each polish session opens the analyzer in the rendered dashboard against real data (typically the React repo), audits *every* surface — hero(es), metrics strip, big number, narrative-KPI, scoring formula, Inspector overlap, bottom panel, extras slot — and proposes whatever changes make it a *great* analyzer. That can include ignoring or contradicting the per-analyzer recommendation below.

A few sessions have already proven this:

- **Churn (RELIC-303)** flipped from narrative-KPI to a directory-rollup table after we saw the metrics strip already showed the narrative-KPI numbers.
- **Blast Radius (RELIC-315)** collapsed three heroes into one histogram, added an `extras` slot to `NarrativeKPI` (reversing RELIC-332's "no extras" decision), and rewrote its sub-content based on what fit visually.
- **Shame** revealed that the per-file score formula itself produces top-of-leaderboard noise on real data, expanding scope from "replace the bottom table" to "rethink the hero, the formula, and the KPI."

**The mapping below is a starting heuristic.** When you discover the right design is different, build the right design — and update this doc *first*, then the ticket.

## Notes for Claude Code

A few things to keep in mind when doing the implementation work this doc describes:

**This doc is the source of truth.** Linear ticket descriptions reference it but are summaries. If a ticket and this doc disagree on a spec detail, the doc wins — and the ticket should be updated to match. If you discover the doc itself is wrong (a spec that doesn't survive contact with the code), fix the doc *first*, then the ticket.

**The Inspector is the per-file detail surface.** Easy to forget when looking at a tab in isolation. The right-side `FileInspector.tsx` already aggregates every analyzer's per-file data on click. When you find yourself thinking "but the user needs to see all the file's metrics" — they already can, on the right. Don't rebuild that in the bottom panel.

**Don't over-engineer the shared component.** `KnowledgeSilosTab.tsx` is ~60 lines. The shared `<NarrativeKPI>` (RELIC-332) should be similarly small — a layout component with a handful of props, not a framework. If the API is growing past the proposed shape in the ticket, push back: you may be solving a problem we don't actually have.

**Tests should match the existing pattern, not invent new ceremony.** Look at neighboring `*.test.ts` and `*.test.tsx` files. Backend additions (`keywordTiers`, `totalInsertions`/`totalDeletions`) get unit tests against the existing test fixtures in `forensics.test.ts` / `rewrite-ratio.test.ts`. The shared `<NarrativeKPI>` component gets a render test covering tier rendering, optional fields, and the `onApplyPreset` callback firing. That's it — don't add visual regression infra unless it already exists.

**Watch the Knowledge Silos visual.** When refactoring `KnowledgeSilosTab.tsx` to consume the shared component (RELIC-332's DoD), the rendered output should be byte-identical to before. Spacing, padding, font weights, severity colors. If something shifts visually, that's a regression — either the shared component is missing a prop or the original tab had inline styles that didn't survive the lift.

**The "see also" footer is sticky for a reason.** The existing one in `ChurnTab.tsx` is buried below a long scrolling table — Dan didn't even know it existed until reviewing the code for this doc. Don't recreate that mistake. Sticky to the bottom of the bottom-panel area, always visible.

**Pre-1.0 versioning rules apply.** Any commit messages with `feat:` get a minor bump, `feat!:` is reclassified to minor (not major) by `.releaserc.json`. See CLAUDE.md "Releases & Versioning" section. Don't let semantic-release jump to 1.0 by accident.

NOTE FROM DAN: I added a `polish-tasks.md` to `/docs` to go over the things that extend the Linear stories.  Please review it.

## Why this doc exists

The dashboard ships a single template across all 22 analyzers: `[hero viz on top] + [SortableTable below]`. After polishing Bus Factor and Churn it became clear the table is often nearly redundant with the hero — same columns, same rows, just rotated. This doc maps each analyzer to a deliberate bottom-panel form so polish tickets execute it instead of re-litigating it.

The parent ticket is [RELIC-331](https://linear.app/nebulord/issue/RELIC-331).

## The Inspector already exists

Critical context that informs everything below: `apps/web/src/components/inspector/FileInspector.tsx` already aggregates every analyzer's per-file data into a single right-side panel that opens when a row is clicked. That means **per-file detail is already covered**. When a bottom-panel table just rotates the hero's data, it's not adding a third dimension — it's a worse version of what the Inspector already does on click.

This shifts the bottom-panel question from *"how do we show file detail?"* to *"what story is missing from the hero?"*

## Bottom-panel forms

| Form | Right when... |
|---|---|
| **Narrative-KPI** | The aggregate story matters more than the row-by-row. Big number + tier badge + one-sentence finding. Pattern lives in `KnowledgeSilosTab.tsx`. |
| **Table (SortableTable)** | The bottom is a *different unit of analysis* from the hero (e.g., per-language table under a per-directory hero) OR the columns carry explanatory chips the hero can't (e.g., Cursed Files' REASONS). |
| **Distribution histogram** | Hero is top-N and the long tail matters. |
| **Time-series** | Aggregate metric over months tells the story. |
| **Smaller multiples** | Per-file rhythm pattern is the point. |
| **Comparison view** | Comparing 2–3 files across metrics is the point. |
| **Companion analyzer** | A neighborhood from a related view earns its space. |

Default to **narrative-KPI** when in doubt. The hero shows the ranked list; the Inspector shows per-file detail; narrative-KPI shows the *aggregate truth* — which is the one slot the other two surfaces don't fill.

## Hero tab count is not fixed

Most polished analyzers have 1–2 hero tabs. Some warrant 3 — Co-Authors / AI (RELIC-320) is the first to ship that shape, with `AI Adoption` (default) + `Per-Author AI Mix` (alt) + `Co-Author Graph` (alt-alt) each answering a distinct question for a distinct audience (manager / engineer / advanced).

The bar for adding a third tab: **does it answer a question the first two don't, for a real audience?** Don't pad to 3 if 2 are enough. Co-Authors / AI passed because the topology lens (force graph) genuinely complements the temporal lens (trend) and the per-person lens (mix bars), AND the docs site explains how to read the topology — so the third tab carries its own weight.

## The narrative-KPI pattern

Reference implementation: `apps/web/src/components/shared/NarrativeKPI.tsx` (the shared layout). Reference consumer: `apps/web/src/components/tabs/KnowledgeSilosTab.tsx`.

Anatomy:

1. **Big number (left)** — severity-colored, mono font, one decisive metric. Examples: top file's % share, count of high-tier files, concentration index.
2. **Tier badge** — under the number. Healthy / Moderate / Critical (or analyzer-specific labels). Threshold-driven.
3. **Small uppercase label** — under the badge. Names what the number means.
4. **Right side: one-sentence finding** — leads with a bolded number that supports the headline KPI. Comes from the analyzer's existing `summary` field where possible.
5. **Sub-line** — analyzer's secondary `summary` text or a derived breakdown (tier counts, etc.).
6. **Sticky "See also" footer** — links to 2 related analyzers via `onApplyPreset(...)`. Sticky to the bottom of the bottom-panel area, not buried below a scrolling list. (See "Footer pattern" below.)
7. **Docs link in tab bar** — when the analyzer's preset declares `docsPath`, a right-anchored `Docs ↗` link appears in the bottom-panel tab bar pointing at the analyzer's docs page. See "Docs link" section below.

A shared `<NarrativeKPI>` component should be lifted from `KnowledgeSilosTab.tsx` into `apps/web/src/components/shared/`. Filed as [RELIC-332](https://linear.app/nebulord/issue/RELIC-332) — blocks all four Batch 1 polish tickets.

## Footer pattern (sticky "See also")

Discovered while reviewing `ChurnTab.tsx`: the existing "See also" link footer is buried at the bottom of a long scrolling table — easy to miss entirely. **Make it sticky to the bottom of the panel** so it's discoverable without scrolling. Applies to every bottom panel (narrative-KPI or otherwise).

Two related-analyzer links per footer. Per-analyzer choices are listed in the mapping below.

## Docs link

Each polished analyzer has a docs page at `apps/docs/analyzers/<slug>.md`. The dashboard surfaces a link to it from the bottom-panel tab bar — right-anchored, plain `Docs ↗` text link, conditional on the analyzer's preset declaring a `docsPath`.

Wiring (two-step):

1. **Author the docs page** at `apps/docs/analyzers/<slug>.md` following the established analyzer-page structure (see existing pages: `churn.md`, `bus-factor.md`, `parallel-dev.md`).
2. **Set `docsPath` on the analyzer's preset** in `apps/web/src/presets/registry.ts`:

   ```ts
   docsPath: 'analyzers/<slug>',
   ```

The link renders automatically once both are in place. The `registry.test.ts` DoD-enforcement assertion fails on CI if a docs page exists on disk but `docsPath` isn't set — so forgetting to wire the link breaks the build.

Dashboard-tier presets (`overview`, `risk`, `tech-debt`) intentionally do **not** set `docsPath` — they compose multiple analyzers and don't have a 1:1 docs page.

## Existing data, currently unused

Every analyzer's report already produces:
- A `summary` string (e.g., Churn's `"renderer.js has been modified in 8% of all commits"`)
- Aggregate counts (`hotspotCount`, `highBlast`, `highRewrite`, etc.)
- Tier/category enums with explicit thresholds

**The frontend doesn't use any of this.** Adopting narrative-KPI surfaces it for free.

## Mapped so far (Batch 1)

The four analyzers in Batch 1 all share the "table is rotated hero" pathology. Three of them (`forensics`, `blast-radius`, `rewrite-ratio`) get narrative-KPI bottom panels. **`churn`** moved to a directory roll-up table after evaluating against the rendered Churn page — its candidate narrative-KPI numbers (`Top File Commits`, `Top File Share`) are already shown in the metrics strip, leaving the directory lens as the only churn-specific story the screen doesn't already tell.

> **Hero scope creep is OK when warranted.** Originally Batch 1 was scoped strictly to bottom-panel work. `blast-radius` widened it: a forensic look at the three hero views found that two were redundant with other analyzers (Scatter ↔ Hotspots, Coupling ↔ Coupling) and the third had a structural diagonal artifact. Replacing all three with a single distribution histogram fell out naturally from the narrative-KPI work. Future polish tickets should ask the same value question per `polish-tasks.md` — *"is each hero pulling its weight?"* — before defaulting to the doc's bottom-panel-only scope.

### `churn` *(shipped — RELIC-303)*

- **Bottom panel:** Table (directory roll-up), **split into two BottomTabs** sharing one component (`Churn` / `Test Files`). Different unit of analysis from the per-file hero — answers "where in the codebase does churn live?" — and isolates source-vs-test churn so neither story drowns out the other.
- **Columns:** Directory · Commits · Share (% of all repo commits) · Files · Top file.
- **Aggregation:** Group by each file's immediate parent directory; sort by total commit count desc; show top ~10. Same util feeds both tabs with a path-classifier pre-filter.
- **Test classification:** `apps/web/src/utils/isTestPath.ts` — segments `__tests__/`, `__snapshots__/`, `__fixtures__/`, `tests/`, `cypress/`; basename patterns `.test.`, `.spec.`. Conservative; designed to be liftable to core later as a repo-level `testPaths` config that other analyzers (test-coverage, age-map, complexity-trend, blast-radius) can share.
- **Why not narrative-KPI:** the metrics strip already shows `Top File Commits` and `Top File Share` — a narrative-KPI would be a third copy of the same number. Inspector already shows per-file detail (LOC, authors, age, category). The per-directory lens is the only one missing from the screen.
- **Why split tabs not filter:** test-heavy repos (React's `__tests__/fixtures/compiler` at 24% / 984 files) drown out the source story when conflated. Splitting preserves both signals without forcing a global filter decision.
- **See also:** Hotspots, Cursed Files. Sticky to the bottom of the panel.
- **Backend changes:** None — derived from `report.churn.files[]` in the frontend.
- **Removes:** ChurnTab's per-file SortableTable + cross-analyzer join (loc + bus factor + age map, ~90 lines). All redundant with the Inspector.

### `forensics` (Shame tab) *(shipped — RELIC-308)*

- **Bottom panel:** Narrative-KPI.
- **Big number:** Files with `shameScore ≥ 70` (post-formula-fix). Tier badge thresholds **0 = Healthy · 1–9 = Moderate · 10+ = High Shame** — mirrors blast-radius's absolute-count thresholding so the headline is comparable across analyzers.
- **Sub-content:** `N` shame commits — **X** critical (revert/hotfix/oops) · **Y** moderate (hack/workaround) · **Z** mild (fix/bug). The tier weighting is unique to this analyzer; the subline carries it. Sub-line beneath: total file count after the min-commit-confidence floor.
- **Extras (`NarrativeKPI.extras` slot):** "Where they live" — top-5 directory rollup of the high-shame (`≥70`) files (same shape as blast-radius). Each row: parent directory · proportional bar · file count · share %. New aggregator at `apps/web/src/utils/shameByDirectory.ts`.
- **Hero:** **Two tabs** sharing one component — `Trend` (default) + `Leaderboard` (alt). Forensic look at the existing leaderboard against React data revealed every entry tied at score 100, because the score formula `(rawShamePoints / totalCommits) × 100` sets a single-commit YAML with one "fix" keyword to 100. Polish therefore expanded scope to include a formula fix and an alternative hero.
  - **Trend (default):** stacked-bar by month, three layers per bar (critical · moderate · mild commit counts), tier-colored. Answers the temporal question — *is shame trending up, and is the severity mix shifting toward worse tiers?* — that nothing else on the screen surfaces.
  - **Leaderboard (alt):** revised version of the existing horizontal bar leaderboard, filtered to files passing the confidence floor, with bar color encoding the file's dominant keyword tier (red/orange/yellow). Answers *which files actually carry sustained shame?*
- **Hero captions:** wired into both Shame heroes via the existing shared `<HeroCaption>` (already used by `ChurnBar` / `OwnershipBar`). Backport: same caption strip is **also added to `BlastHistogram`** in this PR — it shipped without one in RELIC-315 and the missing caption is a regression against the Churn/Bus Factor pattern.
- **See also:** Cursed Files, Bus Factor. Sticky to the bottom of the panel.
- **Backend changes:**
  - Add `keywordTiers: { critical: number; moderate: number; mild: number }` aggregate to `ForensicsReport` (commit-level counts).
  - Add `byMonth: Array<{ month: string; critical: number; moderate: number; mild: number }>` aggregate to `ForensicsReport` for the Trend hero.
  - **Score formula fix:** confidence multiplier — `shameScore = round(rawScore × min(1, totalCommits / 5))`. Sub-floor files get scaled down proportionally (1-commit YAML drops from 100 to 20) instead of zeroed out. Cursed-files' existing 75/50/25 thresholds keep meaning the same thing.
- **Downstream effects:** `fixture-regression.test.ts.snap` regenerates (~10 score updates); `cursed-files.test.ts` may need expectation tweaks if any test fixture has <5 commits.
- **Removes:** ShameTab's per-file SortableTable (~95 lines). Inspector + leaderboard-hero already cover per-file detail.

### `blast-radius` *(shipped — RELIC-315)*

- **Bottom panel:** Narrative-KPI.
- **Big number:** Count of files with `blastScore` ≥ 70. The analyzer computes this inline in its `summary` string (`packages/core/src/analyzers/blast-radius.ts`) but doesn't expose it on `BlastRadiusReport`; the tab filters `report.blastRadius.files` itself. One-liner, no backend change needed.
- **Tier thresholds:** 0 = Low Risk, 1–9 = Moderate Risk, 10+ = High Risk. Absolute count (not proportional) — architectural load-bearers are uncommon in any repo size, so absolute thresholds are easier to reason about.
- **Sub-content:** Top **three** blast files (file basename + avg / peak) as the finding; **tier mix** breakdown (low/medium/high/critical counts) as the subline. The original spec called for "summary string + top file's avg co-change count," but a forensic look at the rendered panel showed (a) the analyzer's summary just rephrased the big number and (b) the panel had real estate to surface more files than the headline. Top-3 + tier mix density-up the panel without overstepping the Inspector's per-file detail surface.
- **Extras (`NarrativeKPI.extras` slot):** "Where they live" — top-5 directory rollup of the high-blast (`≥70`) files. Each row: immediate parent directory · proportional bar · count · share % of all high-blast files. Aggregator at `apps/web/src/utils/blastByDirectory.ts`. Answers the "if I want to reduce blast radius, where do I look?" question that the histogram (distribution shape), top-3 (per-file worst), and Inspector (per-file detail) can't.
- **NarrativeKPI shared component change:** Added an optional `extras?: ReactNode` slot, rendered full-width between the kpi-row and the sticky see-also footer. Reverses the original RELIC-332 "no extras slot" decision after seeing the rendered panel — a forensic look against React data showed substantial vertical empty space below the KPI/finding/subline row, and the directory rollup couldn't fit in `subline`'s 400px constrained width. Other Batch 1 analyzers (forensics, rewrite-ratio) may opt in similarly when they have analyzer-specific drill-downs that don't fit the constrained subline; canonical sparse layout (Knowledge Silos) leaves it `undefined` and renders identically to before.
- **Hero:** Collapsed from three views (Blast scatter / Scatter / Coupling) down to a **single distribution histogram** of blast scores, 10 bins of width 10, colored by tier of bucket midpoint, with the ≥70 zone shaded and labeled. The original Blast scatter had a structural diagonal (`blastScore = avg / maxAvg × 100` — x and y axes were the same number rescaled); the alt-tab Scatter duplicated Hotspots' churn × LOC; the alt-tab Coupling duplicated the Coupling analyzer's hero. Histogram answers the only question those three didn't: *what's the distribution shape of blast risk in this repo?*
- **See also:** Coupling, Hotspots.
- **Backend changes:** None.

### `rewrite-ratio` *(shipped — RELIC-314)*

- **Bottom panel:** Narrative-KPI.
- **Big number:** `report.rewriteRatio.highRewrite` — count of files with `rewriteScore ≥ 70` after the formula fix (see below). Now exposed on the report; previously computed inline in the summary string only.
- **Tier thresholds:** 0 = Healthy · 1–4 = Moderate · 5+ = High Rewrite. Tighter than Blast (1–9 / 10+) because rewrite-heavy files are usually fewer per repo.
- **Sub-content:** Top **three** high-rewrite files (basename + `+ins / −del`) as the finding, sliced from the threshold-filtered subset (per RELIC-315 lesson). Subline: repo balance — *"+X / −Y · net +Z · N% of files balanced (ratio > 0.5)"* — the aggregate growth-vs-rewrite angle unique to this analyzer.
- **Extras (`NarrativeKPI.extras` slot):** "Where they live" — top-5 directory rollup of the high-rewrite files. Aggregator at `apps/web/src/utils/rewriteByDirectory.ts`. Same shape as Blast Radius and Shame — three Batch 1 panels now share one layout.
- **Hero:** Two views — `Rewrites` (default `RewriteDivergingBar`, top-30 by score) + `Distribution` (new `RewriteHistogram`, mirrors `BlastHistogram` 1:1 with 10 bins, ≥70 zone shaded). Dropped the previous `Scatter` alt-tab (was wired to `HotspotScatter` — a pure dup of the Hotspots default hero) and `Debt` alt-tab (was wired to `DebtScatter` — owned by the Tech Debt curated dashboard, not rewrite-ratio's territory). Same "two redundant alts" pathology blast-radius had.
- **HeroCaption backport:** added to `RewriteDivergingBar` (was missing — backport-style fix paralleling the BlastHistogram caption added during RELIC-308).
- **See also:** Churn, Hotspots.
- **Backend changes:**
  - **Score formula fix:** confidence multiplier — `rewriteScore = round(rawScore × min(1, min(ins, del) / 30))`. The smaller side of the diff IS the rewrite signal, so it's the analyzer-specific confidence basis. `+1/-1` files no longer tie with `+116/-116` at 100. Mirrors Shame's `min(1, totalCommits / 5)` precedent. Snapshot regenerates (`fixture-regression.test.ts.snap`); cursed-files unaffected (it doesn't consume `rewriteScore`).
  - **Three new aggregates** on `RewriteRatioReport`: `totalInsertions`, `totalDeletions` (repo-wide), and `highRewrite` (count of files ≥70).
- **Metrics-strip slot 2 fix:** replaced misleading `High Rewriters` (which used `topRewriters.length`, capped at 10) with `Files ≥70` (sourced from the new `highRewrite` aggregate). Severity bands match the panel's tier badge (0 / 1–4 / 5+).
- **Scope expansion:** Like blast-radius, the polish ticket exceeded its original bottom-panel-only spec — a forensic look at the rendered Rewrite Ratio tab against React data revealed every top-30 score tied at 100 (formula bug) and two of three alt-tabs duplicating other analyzers' heroes (hero audit). Same "*hero scope creep is OK when warranted*" precedent.
- **Removes:** `RewriteRatioTab`'s per-file `SortableTable` (~107 lines). Inspector + diverging-bar already cover per-file detail.

### `cursed-files` *(shipped — RELIC-307)*

- **Bottom panel:** Table, kept. The Pending-table guess ("bottom table earns space (REASONS chips)") held — the reasons grid is the panel's whole value, and no other view shows *why* a file scored. Narrative-KPI was considered and rejected: it would surface one file's story and discard the multi-file comparison the reasons chips exist for.
- **Row expand:** the per-file `narrative` string, which the analyzer had always emitted and nothing rendered. Same affordance as `HotspotsTab` (`SortableTable`'s existing `renderExpanded`). Filed under "Existing data, currently unused" — worth grepping other analyzers for the same pattern before their polish passes.
- **Hero:** dropped `treemap` (`ChurnTreemap` — repo-wide churn of every file, the RELIC-333 firehose shape). `risk-heatmap` promoted to default, `scatter` retained.
  - **Known gap:** `RiskHeatmap` does not read `report.cursedFiles` either, and is verbatim the `risk` preset's default. It's a closer proxy — it composes the same ownership / blast-radius / shame inputs that feed `curseScore` — but this preset still has no curse-score-native hero. Promoting the existing alt was chosen over building one in this pass; a dedicated hero (e.g. stacked contribution-by-reason bars per file) is the open follow-up.
- **See also:** Churn, Bus Factor.
- **Backend changes:**
  - **Bot-churn exclusion.** Files whose commits are majority-bot (`BOT_CHURN_THRESHOLD = 0.5`, via `utils/authorClassification`) are scored, then withheld and named in `excludedBotFiles`. Motivated by gitrelic's own report, where the only two cursed files were `CHANGELOG.md` (94% `semantic-release-bot`) and `apps/cli/package.json` (79%) — machine-written files presented as the repo's top risks. AI-authored commits classify as `ai`, not `bot`, and deliberately count as human churn.
  - **Age-paradox correction.** The `ageInDays > 180 && churnScore > 60` branch rendered as *"Still actively changing despite being a stale file"*, but `ageInDays` measures time since a file's **last** commit — so it described a file untouched for six months and asserted the opposite. Wrong in any repo; a dormant one (slow-life, last commit 337 days ago) made it fire on everything. Now measured against the repo's own last commit and reworded to *"Heavily churned, then untouched for N days"*. Not cosmetic: the reason carried +10, so slow-life dropped 4 cursed files → 2.
  - **Shape change:** `cursedFiles` moved from `CursedFile[]` to `CursedFilesReport { files, excludedBotFiles, summary }`, matching every sibling analyzer. `normalizeReport` lifts the old array form.
- **Empty state earns its keep.** With bot exclusion on, a healthy repo shows zero cursed files — which reads as broken unless the withheld list is shown. Rendered in **both** branches, not just when the table is empty: a repo can have surviving cursed files *and* withheld ones, and hiding the list in that case defeats the point of withholding transparently.
- **Lesson for later polish tickets:** neither backend bug was visible from the code or from unit tests — the fixtures never triggered the age branch, and gitrelic's own repo is bot-heavy and never dormant. Both surfaced only by running the analyzer against an unrelated, long-abandoned repo. Polish passes should include at least one repo that is *not* this one.

### `parallel-dev` *(shipped — RELIC-309)*

- **Decision context:** [RELIC-333](https://linear.app/nebulord/issue/RELIC-333) resolved — keep separate, differentiate. The shared `Swimlanes` and `Timeline` heroes are repo-wide commit-firehose visualizations that encode nothing about either analyzer's per-file score. Both heroes get **stripped from this preset entirely** (still alive in Contributors / Overview where they answer the right question).
- **Bottom panel:** Narrative-KPI.
- **Big number:** `highParallel` — count of files with `parallelScore ≥ 70`. New aggregate on `ParallelDevReport`.
- **Tier thresholds:** 0 = Healthy · 1–4 = Moderate · 5+ = High Concurrency. Same shape as Rewrite Ratio's tier band — concurrent-work files are uncommon at any repo size.
- **Sub-content:** Top **three** files (basename + `N parallel weeks · K peak authors`) as the finding; subline = tier mix `X high · Y moderate · Z low` derived from the new `tierMix` aggregate.
- **Extras (`NarrativeKPI.extras` slot):** "Where they live" — top-5 directory rollup of high-parallel files. Aggregator at `apps/web/src/utils/parallelDevByDirectory.ts`. Same shape as Blast Radius / Shame / Rewrite Ratio / Bus Factor — five Batch 1+ panels share one layout.
- **Hero (default):** `ParallelScoreHistogram` (NEW) — 10 bins of width 10, distribution of `parallelScore` across all parallel files, ≥70 zone shaded. Mirrors `BlastHistogram` / `BusFactorHistogram` / `RewriteHistogram` 1:1. Answers *"what's the shape of concurrency risk in this repo?"* — the question both shared firehose heroes failed to answer.
- **Hero (alt):** `ParallelTimeline` (NEW) — repo-aggregate monthly bar chart: count of distinct `(file, week)` parallel events per month, color-tinted by avg author count. Answers *"is parallel-development pressure trending up or down over time?"* — the temporal angle the histogram alone can't show, but framed around parallel events specifically (not the firehose Timeline's per-author commit volume).
- **Removed heroes:** `swimlanes`, `timeline` (both still alive in Contributors / Overview presets).
- **Metrics-strip slot 2 fix:** replace `Hot Files` (capped at `hotFiles.length` ≤ 10, semantically meaningless ceiling) with `High Parallel` (sourced from new `highParallel` aggregate). Severity bands match the panel's tier badge (0 / 1–4 / 5+). Mirrors the Rewrite Ratio `Files ≥70` slot fix from RELIC-314.
- **See also:** Co-Authors, Coupling. Sticky to the bottom of the panel. (Both are about *collaborative structure*; bus-factor is about ownership concentration which is sort of orthogonal.)
- **Backend changes:**
  - Add `highParallel: number` to `ParallelDevReport`.
  - Add `tierMix: { low: number; medium: number; high: number; critical: number }` aggregate to `ParallelDevReport` (per-file score band counts using thresholds 0–24 / 25–49 / 50–74 / 75+ — match Bus Factor's tier-mix shape for consistency).
  - Add `byMonth: Array<{ month: string; parallelEvents: number; uniqueFiles: number; avgAuthors: number }>` aggregate for the `ParallelTimeline` alt. Bucketed by ISO calendar month of `weekStart`.
  - No score formula changes — current `parallelScore` already has confidence-style guarding via `MIN_ACTIVE_WEEKS = 3` and the `MIN_PARALLEL_SCORE = 20` floor.
- **Removes:** `ParallelDevTab`'s per-file `SortableTable` (~75 lines). Inspector + new histogram + alt timeline + narrative-KPI top-3 already cover per-file detail at every granularity.

### `commit-timing` *(shipped — RELIC-323)*

- **Decision context:** [RELIC-333](https://linear.app/nebulord/issue/RELIC-333) resolved — keep separate, differentiate. The current `Timeline` default (stacked-area-by-author commit chart) encodes nothing about hour-of-day or day-of-week — the only two dimensions commit-timing actually measures. Both shared firehose heroes get stripped from this preset.
- **Bottom panel:** Narrative-KPI.
- **Big number:** `highStress` — count of files with `stressScore ≥ 70`. New aggregate on `CommitTimingReport`.
- **Tier thresholds:** 0 = Healthy · 1–4 = Moderate · 5+ = High Stress. Same shape as parallel-dev's tier band for consistency across the Team & Activity group.
- **Sub-content:** Top **three** stressed *contributors* (full git author name + `Late: N% · Weekend: K% · M commits`) as the finding — pivots away from the originally-spec'd per-file finding to mirror Bus Factor's people-pivot precedent (RELIC-304). Rationale: commit-timing is fundamentally about *human behavior*, not file properties; on a healthy repo (React, top-stress = 40 → `highStress = 0`) a per-file finding hollows the panel, while per-author always carries because author stress percentages exist on every repo with commits. Subline: repo-aggregate `X% late-night · Y% weekend across the analyzed window`.
- **Extras (`NarrativeKPI.extras` slot):** "Where they live" — top-5 directory rollup of high-stress files. Aggregator at `apps/web/src/utils/commitTimingByDirectory.ts`. Same shape as the rest of the Batch 1+ panels.
- **Hero (default):** `CommitPunchCard` (NEW) — 7×24 heatmap, days of week (rows: Sun–Sat) × hours of day (columns: 0–23), cells colored by repo-wide commit count via the new `repoHourDayMatrix` aggregate, **log-scaled** color ramp. Late-night columns (23, 0–4) and weekend rows (Sat, Sun) get a subtle warning-color tint behind them — the intersection is visibly the worst quadrant without breaking the unified single-color cell ramp. Iconic git-timing visualization (GitHub's punch-card chart was this exact form).
- **Hero (alt):** `StressTrend` (NEW) — 3-layer disjoint stacked bar by ISO month: `weekendLateNight` (critical) · `singleCriterion` (warning) · `healthy` (neutral). Bars sum cleanly to total commits per month. **Replaces the originally-spec'd `StressHistogram`** — a forensic look against the React repo (top-stress=40) showed the histogram on healthy repos collapses to a leftward spike that confirms the big number visually but adds no axis the punch card lacks. `StressTrend` adds the temporal axis the punch card cannot show (per-month evolution of the worst-vs-mild stress mix). Same kind-of-chart as `ShameTrend` (RELIC-308) and `ParallelTimeline` (RELIC-309); the fourth disjoint-severity time-series in the polish initiative.
- **Removed heroes:** `timeline`, `swimlanes`.
- **Metrics-strip retune:** Slot 3 `Stress Files` (`> 50`) → `High Stress` (`≥ 70` file count). Slot 4 `Top Stress` (top file's score) → `Stressed Authors` (count of `authorStress` entries with `stressScore ≥ 50`, with `MIN_AUTHOR_COMMITS = 5` floor applied upstream) — mirrors the panel's people-pivot. Severity bands match the panel's tier badge for slot 3 (0 / 1–4 / 5+); slot 4 uses 0 / 1–2 / 3+ since per-author stress is harder to push past 50.
- **See also:** Shame, Hotspots. Sticky to the bottom of the panel. (Stress-adjacent: shame keywords correlate with crisis commits, and hotspots are typically the same files getting stressed.)
- **Backend changes:**
  - Add `repoHourDayMatrix: number[][]` (7 rows × 24 cols, day-of-week × hour) to `CommitTimingReport`. Required for the punch card.
  - Add `highStress: number` (count of files with `stressScore ≥ 70`).
  - Add `tierMix: { low; medium; high; critical }` aggregate (band counts using 0–24 / 25–49 / 50–74 / 75+ — same shape as parallel-dev / bus-factor). Computed from `files[]`; independent of the per-author `MIN_AUTHOR_COMMITS` floor.
  - Add `byMonth: Array<{ month; weekendLateNight; singleCriterion; healthy; total }>` aggregate for `StressTrend`. Months are bucketed by *local time* (extending `parseLocalTime` to also yield ISO month) so commits at month-boundary timezone offsets land in the correct calendar month.
  - Add `authorStress: AuthorStressProfile[]` aggregate sorted desc by per-author `stressScore`, with `MIN_AUTHOR_COMMITS = 5` floor applied — sub-floor authors are dropped from the report shape entirely. Includes name-collision disambiguation: if ≥2 distinct emails share an identical full git-name string, every member of the colliding group gets a `(local-part)` suffix appended (handles 2-author and N-author collisions identically).
  - No score-formula changes — current `stressScore = lateNightPercent * 0.6 + weekendPercent * 0.4` is appropriately weighted; per-file `< 3` commit floor unchanged.
- **Removes:** `CommitTimingTab`'s per-file `SortableTable` (~85 lines). Inspector + punch card + stress histogram + narrative-KPI top-3 already cover per-file detail at every granularity.

### `bus-factor` *(shipped — RELIC-304)*

- **Bottom panel:** Narrative-KPI replacing the SortableTable. Re-polish after the original Bus Factor pass was prematurely closed pre-pattern.
- **Big number:** `report.busFactors.overallBusFactor` — the canonical "min unique authors across the top-20 most-concentrated files," already on the report but never rendered. Not duplicated by the metrics strip (which shows `Critical Files`, `Solo-Owned`, `Solo-Owned %`, `Dominant Owners`).
- **Tier thresholds:** `1 = Critical` (single point of failure), `2–3 = High Risk`, `4+ = Resilient`. Anchored on the canonical bus-factor definition. `0` is reserved for empty-repo state and shows a neutral `No Data` badge.
- **Sub-content:** Top **three dominant owners** (author email · `N files (P%)`, grouped from `criticalFiles` by `dominantAuthor`) as the finding; tier mix breakdown (`X critical · Y high · Z medium · W low`) as the subline using the analyzer's per-file `risk` enum.
- **Extras (`NarrativeKPI.extras` slot):** "Where they live" — top-5 directory rollup of `risk === 'critical'` files. Aggregator at `apps/web/src/utils/busFactorByDirectory.ts`. Same shape as Blast Radius / Shame / Rewrite Ratio — four Batch 1+ panels now share one layout.
- **Why author-centric finding (not file-centric):** Bus Factor is fundamentally about *people*, not code. On a real repo (React) the top-3 critical files were all dominated by a single author — the file-centric finding conveyed one fact across three rows. Swapping to top-3 dominant owners (`mail@hendrik-liebau.de — 287 files (16%)` / etc.) answers the analyzer's actual question: *"who would knowledge collapse on if they got hit by a bus?"* — directly. Aggregator at `apps/web/src/utils/topDominantOwners.ts`. The Bus Bar alt covers the file-level drill-down lens.
- **Hero audit (scope expansion):** A forensic look at the rendered Bus Factor tab against React data confirmed the hero pathology: `Bus Bar` (default) was visually flat — every top-N file pegged at `dominantAuthorPercent === 100` (single-author saturation), making 20+ identical-looking red bars. The two alt heroes were also redundant: `risk-heatmap` is Cursed Files territory and `ownership` (OwnershipBubble) is Contributors territory. Same "redundant alts" pattern Blast Radius and Rewrite Ratio fixed.
- **Hero:** Two views — `Distribution` (new default `BusFactorHistogram`, mirrors `BlastHistogram` / `RewriteHistogram` 1:1 with 10 bins of width 10) + `Bus Bar` (existing `OwnershipBar`, demoted to alt). Threshold marker shaded at ≥90% (cleanly aligned to the last bucket boundary AND to the analyzer's `risk === 'critical'` band — no off-by-bucket fudging). Dropped both shared alt heroes (`risk-heatmap` + `ownership`).
- **Why histogram default, not Bus Bar:** the saturated 100%-cluster on real repos turns the leaderboard into a wall of identical red bars. The histogram answers the unique question — *what's the shape of ownership concentration?* — that the saturated bar can't, and demotes the leaderboard to alt-view duty where it's still useful when narrowed by hover/inspector.
- **See also:** Knowledge Silos, Ghost Files. Sticky to the bottom of the panel. (The three ownership-risk siblings — Bus Factor / Knowledge Silos / Ghost Files — now triangulate ownership from three different aggregations: distribution shape + author concentration + dormant ownership.)
- **Backend changes:** None — `overallBusFactor` already shipped on `BusFactorReport`; tier mix derived in the frontend from `f.risk`.
- **Removes:** `BusFactorTab`'s per-file `SortableTable` (~110 lines). Inspector + leaderboard hero already cover per-file detail. `sortBusFactor.ts` retained because `OwnershipBar` (now the alt hero) still consumes it.
- **Pre-1.0 versioning note:** ships as `feat:` (minor bump). `OwnershipBar` is technically still wired but defaults change — Sidebar deep-links that pinned the old `ownership-bar` default will silently fall through to the new histogram. No breaking change to the public CLI surface.

### `contributors` *(shipped — RELIC-306)*

- **Bottom panel:** Polished `SortableTable` (kept the table form). Six columns: Contributor (name + email + status dot + ghost badge inline) · Commits (default sort desc, pre-sorted by analyzer) · Files · Lines · Last Active · Focus Areas (top 3, was top 2). Removed the standalone Status column — consolidated into the Contributor cell. Display-name presentation throughout (`Sebastian Markbåge` not `sebastian@calyptus.eu`); email rendered smaller below the name as a disambiguation aid, suppressed when name is empty so a name-missing fallback doesn't render the email twice. The doc's original Batch-3 reasoning ("table earns space because hero is per-directory") was based on Bubble being default; once Swimlanes became default, both surfaces are per-author, but the table still earns space because it's a different *density* — full sortable list of N vs. ~10 visible swimlane rows.
- **Hero (default):** `ContributorSwimlanes` (was alt; promoted). Per-author rows × time × commit-intensity. Answers "who is active when, and how intensely?" — the lead question for a contributors analyzer. Wrapped in `flex flex-col` so a `<HeroCaption>` strip sits beneath the scroll container.
- **Hero (alt):** `OwnershipBubble` (was default; demoted, registry key `ownership` → tab label "Ownership"). Per-directory bubble pack sized by LOC, colored by dominant author. Answers "who works on which parts of the codebase?". Cleaned up: bubble labels and tooltip use display names (was email-prefix), `<HeroCaption>` replaced the inline footer div, legend intentionally still renders emails (deferred per RELIC-306 scope, comment in source documents the deferral).
- **Hero captions:** added to both via shared `<HeroCaption>` component (parity with Churn / Bus Factor / Rewrite Ratio).
- **Removed heroes:** `ownership-sunburst` from contributors preset altTabs (component itself stays — Knowledge Silos and Ghost Files still consume it). Same "redundant alts" pathology Bus Factor and Rewrite Ratio fixed: sunburst is the *lead* hero in those analyzers where the file-tree-by-risk framing fits; on Contributors it answered a worse version of those analyzers' questions.
- **Decision: no Timeline rehoming.** Considered as a third hero alt (the homeless stacked-area-by-author from RELIC-323). Rejected because (a) Timeline still lives in Overview's altTabs — it isn't actually homeless, and (b) it partially overlaps Swimlanes (both temporal-by-author, just different aggregation density). Two-tab pattern is cleaner. Can revisit if there's pull later.
- **Metrics strip retune:** Slot 1 `Active Contributors` (existing — now severity-banded `0/1 critical / 2–5 warning / 6+ healthy`). Slot 2 `Top-3 Share %` (NEW — velocity concentration, not on screen anywhere else: `<40% healthy / 40–69% warning / ≥70% critical`). Slot 3 `Ghost Authors` (existing — moved from slot 2, severity-banded by ghost ratio: `0 healthy / <30% warning / ≥30% critical`). Slot 4 `Newcomers (90d)` (NEW — team-renewal signal: `0 stale-grey / 1+ healthy`). Dropped: `Total Commits` (meta-stat without team-health signal). Mirrors Rewrite Ratio / Parallel Dev / Commit Timing precedent of replacing shape-of-data counts with health-tiered counts. Also fixed pre-existing semantic bugs: the old composer was reading `report.meta.totalAuthors` (total ≠ active) and `report.ghostFiles.totalGhostFiles` (files ≠ authors); rewrite reads `report.contributors.*` directly.
- **See also:** Bus Factor, Ghost Files. Sticky to the bottom of the panel. Completes the ownership-risk triangle from the contributor vertex (per-file concentration + dormant-file ownership).
- **Backend changes:**
  - Add `top3CommitShare: number` (0-100, %) to `ContributorReport`. Sum of top-3 commitCount divided by total commits × 100. Empty-repo guard returns 0.
  - Add `newcomers90d: number` to `ContributorReport`. Count of contributors with `firstCommit ≤ 90d ago` from `now`. Inclusive boundary.
  - No score-formula changes (Contributors has no per-file score).
  - `normalizeReport.ts` extended to per-field merge for the contributors slice (rather than object-level `??` fallback) so old report JSONs without the new fields default to 0 rather than `undefined`.
- **Removes:** `ContributorsTab`'s standalone `Status` column (consolidated into Contributor cell). `'ownership-sunburst'` from contributors preset altTabs. `Total Commits` slot from metrics strip.

### `co-authors` *(shipped — RELIC-320)*

- **Reframe:** Lead question shifted from *"who collaborates with whom?"* to *"how is AI assistance and human collaboration showing up in this codebase?"* Sidebar label: `Co-Authors` → `Co-Authors / AI`. Registry key `'co-authors'` unchanged so existing deep-links still work.
- **Data-layer fix shipped in same PR:** `getAllCommits` was using `--format=%s` (subject only). `Co-Authored-By:` trailers live in commit bodies, so the analyzer was empty on every repo. Switched to git's native trailer parser (`%(trailers:key=Co-authored-by,valueonly,separator=%x1F)`) on a new `TRAILERS|...` line; `RawCommit` gains a typed `coAuthors: CoAuthor[]` field. Future analyzers wanting body-derived signals can use the same delimiter pattern.
- **Hero:** **3 tabs** — `AI Adoption` (default, 2-stack monthly trend) · `Per-Author AI Mix` (alt, horizontal AI/solo bars per human) · `Co-Author Graph` (alt-alt, polished force graph; renamed from "Repository Map"). First analyzer in the polish initiative with 3 hero tabs — justified by 3 distinct audiences (manager / engineer / advanced) and validated against the data on GitRelic and React.
- **Bottom panel:** **2 tabs** — `AI Adoption` (default, narrative-KPI form) + `Co-Author Pairs` (alt, classified table with `[AI]` / `[Human]` badges). Splits along audience axis (adoption story vs collaboration topology). Same precedent as Churn's `Churn / Test Files` split (RELIC-303), but along audience instead of source-vs-test.
- **Big number:** `aiAdoptionPercent` (B-formula: `aiAssistedCommits / humanAuthoredCommits`).
- **Tier thresholds:** `0% = No Adoption Yet · 1–19% = Low · 20–49% = Moderate · 50%+ = High Adoption`. **Accent (informational) coloring** (`stale` for none, `coupling` for any non-zero), *not* severity. Adoption is a workflow-shape signal, not a risk axis — the dashboard shouldn't moralize the team's tooling choice.
- **Sub-content:** Top 3 humans by AI commit count (display names + `aiCommits` + `personalRatio` tooltip). Subline carries B + A ratios side-by-side: `"234 AI-assisted commits · 47% of human work · 42% of all repo activity"`. Three scenario states (`no-trailers` / `no-ai` / `standard`) with distinct copy and big-number rendering — see "three repo modes" in `apps/docs/analyzers/co-authors.md`.
- **Bot/AI classification utility:** New shared util `packages/core/src/utils/authorClassification.ts` — recognizes Claude (`noreply@anthropic.com`), GitHub Copilot Workspace, Aider, Devin, Cursor as AI; semantic-release / dependabot / renovate / GitHub Actions / `[bot]@users.noreply.github.com` catch-all as bots; everything else human. Bots stripped from analysis with a transparent footnote (`"N bot-authored commits filtered"`). Util location chosen so Contributors can adopt it later (separate ticket — Contributors has the same `semantic-release-bot` pollution problem).
- **Web-side classification mirror:** because `apps/web` may only `import type` from `@gitrelic/core` (per CLAUDE.md — value imports leak Node into the browser bundle), the AI/bot pattern logic is mirrored in `apps/web/src/utils/authorClassification.ts` and consumed by the force graph, pair table, and narrative-KPI top-3 finding. The duplicate has a sync-pointer comment; proper fix tracked at [RELIC-341](https://linear.app/nebulord/issue/RELIC-341) (browser-safe subpath export from core).
- **Metrics strip:** Slot 1 `AI Adoption %` (matches panel tier) · Slot 2 `AI Commits` · Slot 3 `AI Authors` · Slot 4 `Human Pairs` · Slot 5 `Co-Author Commits`. **Two-state coloring** (`stale` for zero, `coupling` for non-zero) — adoption is informational, no severity-red anywhere. Replaces five generic count slots from the previous design (Pairs / Co-commits / Collaborators / Avg Commits-Pair / Top Pair Commits — none of which carried any health/adoption signal).
- **See also:** Contributors, Parallel Dev. Footer present on both bottom-panel tabs (consistency across the panel; one-tab visibility doesn't bury the link). Completes the Team & Activity collaboration triangle: totals (Contributors) / observed-concurrent (Parallel Dev) / explicitly-attributed (Co-Authors / AI).
- **Backend additions to `CoAuthorReport`:** `aiAssistedCommits`, `humanAuthoredCommits`, `aiAdoptionPercent`, `aiAdoptionTier`, `aiAuthors`, `humanPairs`, `filteredBotCommits`, `byMonth`, `perAuthorMix`. `CoAuthorPair` gains `classification: 'human-pair' | 'human-ai'`. Bot-involved pairs filtered before they ever reach `pairs[]` or `humanPairs[]`. AI-as-primary-author commits (Devin etc.) excluded from the human denominator.
- **Force-graph polish:** classification colors (AI nodes accent-coupling, humans by per-author hash), single-commit edges hidden by default with filtered-count surfaced in caption, display-name labels (Claude / GitHub Copilot for AI, full names from contributors map for humans, email fallback), improved tooltips replace the cryptic "1 partner" wording, `<HeroCaption>` strip wired through.
- **Removes:** `Pairs` / `Co-commits` / `Collaborators` / `Avg Commits-Pair` / `Top Pair Commits` metrics-strip slots; old `CoAuthorsTab.tsx` (replaced by 2 new tabs); `Repository Map` viz label string.
- **Pre-1.0 versioning:** ships as `feat:` (minor bump). Sidebar registry key unchanged. No `feat!:` trigger.

## Shipped without a spec section

These analyzers completed their polish pass but never had a `###` section back-filled above. The PR is the authoritative record of what was decided; treat the absence of a section here as missing documentation, not as unfinished work.

| Analyzer | Ticket | PR | Evidence |
|---|---|---|---|
| `age-map` | RELIC-305 | [#66](https://github.com/nebulord-dev/gitrelic/pull/66) | `apps/docs/analyzers/age-map.md`, `docsPath` set |
| `ghost-files` | RELIC-318 | [#71](https://github.com/nebulord-dev/gitrelic/pull/71) | `apps/docs/analyzers/ghost-files.md`, `docsPath` set |
| `rename-tracking` (Renames) | RELIC-324 | [#74](https://github.com/nebulord-dev/gitrelic/pull/74) | `apps/docs/analyzers/renames.md`, `docsPath` set |

> **Ticket-numbering warning.** PR #74 shipped *rename-tracking* but was tagged `RELIC-321`, which is the **hotspot-clustering** ticket — so RELIC-321 auto-closed as Done while hotspot-clustering was never touched, and RELIC-324 (the real rename-tracking ticket) stayed open. When reconciling this doc against Linear, trust `apps/docs/analyzers/` and `registry.ts` `docsPath` over ticket state.

## Pending (Batches 2–N)

Not yet decided. Will be filled in as each batch is worked through. Listed here so the doc is honest about what's done vs. open.

| Analyzer | Batch | Notes from initial screenshot review |
|---|---|---|
| `knowledge-concentration` (Knowledge Silos) | — | Panel shipped as the reference implementation, but **no docs page and no `docsPath`** — the docs half of the DoD is outstanding. Tracked at RELIC-319. |
| `test-coverage` | TBD | Treemap. Bottom table earns space (different unit). |
| `loc` (Languages) | TBD | Stacked bars. Bottom table earns space (per-language vs per-directory). |
| `hotspot` | TBD | Strong scatter hero, signals chips earn table's space. Probably keeps. |
| `coupling` | TBD | Matrix heatmap. Bottom shows same-dir pairs vs hero's cross-dir — earns space. |
| `churn-velocity` | TBD | Not screenshotted yet. |
| `dead-code` | TBD | Not screenshotted yet (Stale Files in screenshots may be related). |
| `hotspot-clustering` | TBD | Not screenshotted yet. **RELIC-321 is marked Done in Linear but no work shipped** — see the warning above. |
| `complexity-trend` | TBD | Multi-line time series. Bottom table earns space (precise growth numbers). |

## What this changes for polish tickets

Each Batch 1 polish ticket gets a sharper definition-of-done than the original generic checklist:

- Hero graph(s) — verify metric/granularity/legend
- Bottom panel — replace SortableTable with narrative-KPI per spec above
- Sticky "See also" footer with the two analyzers listed above
- Docs page at `apps/docs/analyzers/<slug>.md` (per "Docs link" section above)
- `docsPath` set on the analyzer's preset in `apps/web/src/presets/registry.ts`
- Backend additions where noted
- Empty / small-repo / huge-repo states
- Copy pass

**Batch 1 tickets depend on [RELIC-332](https://linear.app/nebulord/issue/RELIC-332) (shared `<NarrativeKPI>` component) being completed first.**

## When to update this doc

- After each batch of polish tickets ships, move analyzers from "Pending" to a new "Mapped" section.
- If a polish ticket discovers the spec is wrong, update the doc *first*, then the ticket.
- New patterns (a sixth bottom-panel form, a different footer style, etc.) get added to the forms table.
