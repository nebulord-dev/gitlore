## [0.48.1](https://github.com/nebulord-dev/gitrelic/compare/v0.48.0...v0.48.1) (2026-08-19)


### Bug Fixes

* **core:** release AI-authorship classification fix ([a00a188](https://github.com/nebulord-dev/gitrelic/commit/a00a188f03e734e565e9eaf29e349915d5b2f0db)), closes [#85](https://github.com/nebulord-dev/gitrelic/issues/85)

# [0.48.0](https://github.com/nebulord-dev/gitrelic/compare/v0.47.2...v0.48.0) (2026-08-17)


### Features

* **web:** cursed-files polish (RELIC-307) ([#84](https://github.com/nebulord-dev/gitrelic/issues/84)) ([c426546](https://github.com/nebulord-dev/gitrelic/commit/c4265469a005aea482f722b89b9aec385f925925))

## [0.47.2](https://github.com/nebulord-dev/gitrelic/compare/v0.47.1...v0.47.2) (2026-08-17)


### Bug Fixes

* **cli:** flush stdout before exiting so --json is not truncated ([#83](https://github.com/nebulord-dev/gitrelic/issues/83)) ([e5ad3f8](https://github.com/nebulord-dev/gitrelic/commit/e5ad3f8957a1a246c6cc26af3b715ce3bd6d8fd6))

## [0.47.1](https://github.com/nebulord-dev/gitrelic/compare/v0.47.0...v0.47.1) (2026-08-16)


### Bug Fixes

* **cli:** resolve the repo root so gitrelic runs from any subdirectory ([#82](https://github.com/nebulord-dev/gitrelic/issues/82)) ([427a513](https://github.com/nebulord-dev/gitrelic/commit/427a513c5e96097002b5a82b88e1830ea879a301))

# [0.47.0](https://github.com/nebulord-dev/gitrelic/compare/v0.46.1...v0.47.0) (2026-08-15)


### Bug Fixes

* **deps:** refresh security overrides and sync bundled-deps mirror ([#80](https://github.com/nebulord-dev/gitrelic/issues/80)) ([ad7c065](https://github.com/nebulord-dev/gitrelic/commit/ad7c0659db114a427c1239638c55e0a0cb6e0cc7))


### BREAKING CHANGES

* **deps:** disguised as a security pin. Nothing in the tree
triggers this today, which is precisely why it would go unnoticed.
Bounded the four bare selectors at their major:

- postcss@<8.5.23      -> postcss@>=8.0.0 <8.5.23
- ws@<8.21.0           -> ws@>=8.0.0 <8.21.0
- undici@<6.28.0       -> undici@>=6.0.0 <6.28.0
- dompurify@<3.4.13    -> dompurify@>=3.0.0 <3.4.13

These match the lower bounds the advisories actually specify (ws is
`>= 8.0.0`, undici 6.x is `>= 6.0.0`). postcss and dompurify are
narrowed to the 8.x / 3.x lines deliberately — their advisories
nominally cover everything below the patched version, but no earlier
major is in the tree and forcing one across a major would break it.

Documentation (CLAUDE.md):
- Added a security-override table mapping each override to its backing
  GHSA IDs and its drop condition. package.json is JSON and can't hold
  comments, so the boundaries were previously unauditable.
- Documented that the esbuild override is a tripwire, not an upgrade:
  esbuild is an optional peer of vite 8 (which uses rolldown), so
  narrowing the range dropped it from the tree rather than bumping it.
- Retitled the vitepress>vite section to drop the patch version, which
  went stale on every bump.

Lockfile diff is limited to the four override key strings; no package
resolution changed. Verified: frozen-lockfile install, build, test
(344 core + 787 web), lint, format:check, docs:build, pnpm audit clean.

## [0.46.1](https://github.com/nebulord-dev/gitrelic/compare/v0.46.0...v0.46.1) (2026-05-11)


### Bug Fixes

* **web:** increase font sizes for better readability in RenameSankey component ([6743b25](https://github.com/nebulord-dev/gitrelic/commit/6743b255c9d78bb22939822ecd2edb655ff36da5))

# [0.46.0](https://github.com/nebulord-dev/gitrelic/compare/v0.45.0...v0.46.0) (2026-05-11)


### Features

* **web:** rename-tracking polish (RELIC-321) ([#74](https://github.com/nebulord-dev/gitrelic/issues/74)) ([a9c18ed](https://github.com/nebulord-dev/gitrelic/commit/a9c18ed0f73f51c483203f395c34439073d416d1))

# [0.45.0](https://github.com/nebulord-dev/gitrelic/compare/v0.44.0...v0.45.0) (2026-05-05)


### Features

* **web:** Co-Authors / AI polish (RELIC-320) ([#72](https://github.com/nebulord-dev/gitrelic/issues/72)) ([56c8c50](https://github.com/nebulord-dev/gitrelic/commit/56c8c5029d036cc81ee7327335b47b7980a1b3a1))

# [0.44.0](https://github.com/nebulord-dev/gitrelic/compare/v0.43.0...v0.44.0) (2026-05-04)


### Features

* **web:** ghost files analyzer polish (RELIC-318) ([#71](https://github.com/nebulord-dev/gitrelic/issues/71)) ([552a91c](https://github.com/nebulord-dev/gitrelic/commit/552a91cf43730dd5bd8fc0e63332e8c9fe6c3b15)), closes [#69](https://github.com/nebulord-dev/gitrelic/issues/69)

# [0.43.0](https://github.com/nebulord-dev/gitrelic/compare/v0.42.0...v0.43.0) (2026-05-03)


### Features

* **web:** contributors analyzer polish (RELIC-306) ([#70](https://github.com/nebulord-dev/gitrelic/issues/70)) ([c29a213](https://github.com/nebulord-dev/gitrelic/commit/c29a213fa4fac6e6d5ebb40b3fe267bbf775cb10))

# [0.42.0](https://github.com/nebulord-dev/gitrelic/compare/v0.41.0...v0.42.0) (2026-05-03)


### Features

* **web:** per-analyzer docs links in bottom-panel tab bar ([#69](https://github.com/nebulord-dev/gitrelic/issues/69)) ([fbb3c1f](https://github.com/nebulord-dev/gitrelic/commit/fbb3c1f688062e1f4596bfcbd7cca2f1749ce99b))

# [0.41.0](https://github.com/nebulord-dev/gitrelic/compare/v0.40.0...v0.41.0) (2026-05-03)


### Features

* **web:** commit-timing polish (RELIC-323) ([#68](https://github.com/nebulord-dev/gitrelic/issues/68)) ([555600f](https://github.com/nebulord-dev/gitrelic/commit/555600f240293d8d9b46c7260cd9bd14376f15b0)), closes [hi#stress](https://github.com/hi/issues/stress) [hi#stress](https://github.com/hi/issues/stress)

# [0.40.0](https://github.com/nebulord-dev/gitrelic/compare/v0.39.0...v0.40.0) (2026-05-03)


### Features

* **web:** parallel-dev polish (RELIC-309) ([#67](https://github.com/nebulord-dev/gitrelic/issues/67)) ([76d12b8](https://github.com/nebulord-dev/gitrelic/commit/76d12b8b72ac59cee844ba041257194d910fe4f2)), closes [hi#parallel](https://github.com/hi/issues/parallel) [hi#parallel](https://github.com/hi/issues/parallel) [hi#parallel](https://github.com/hi/issues/parallel)

# [0.39.0](https://github.com/nebulord-dev/gitrelic/compare/v0.38.0...v0.39.0) (2026-05-02)


### Features

* **web:** age-map polish (RELIC-305) ([#66](https://github.com/nebulord-dev/gitrelic/issues/66)) ([5b19686](https://github.com/nebulord-dev/gitrelic/commit/5b196861df38ddf09c7d71d4ae087f1b33abd298))

# [0.38.0](https://github.com/nebulord-dev/gitrelic/compare/v0.37.0...v0.38.0) (2026-05-02)


### Features

* **web:** tailwind migration PR4 — tabs + closer (RELIC-336) ([#64](https://github.com/nebulord-dev/gitrelic/issues/64)) ([8ec0f11](https://github.com/nebulord-dev/gitrelic/commit/8ec0f11e29cb088c5f809ebcde8d068ce2cefaac))

# [0.37.0](https://github.com/nebulord-dev/gitrelic/compare/v0.36.0...v0.37.0) (2026-05-02)


### Features

* **web:** tailwind migration PR3c — complex heroes (RELIC-336) ([#63](https://github.com/nebulord-dev/gitrelic/issues/63)) ([fa0e9a0](https://github.com/nebulord-dev/gitrelic/commit/fa0e9a0b05c40e919f3c6efa47b1903aab37e573))

# [0.36.0](https://github.com/nebulord-dev/gitrelic/compare/v0.35.0...v0.36.0) (2026-05-02)


### Features

* **web:** tailwind migration PR3b — simple heroes (RELIC-336) ([#62](https://github.com/nebulord-dev/gitrelic/issues/62)) ([aa05809](https://github.com/nebulord-dev/gitrelic/commit/aa0580953a14a7a5431edbef5e13fae1fa91748a))

# [0.35.0](https://github.com/nebulord-dev/gitrelic/compare/v0.34.0...v0.35.0) (2026-05-02)


### Features

* **web:** tailwind migration PR3a — inspectors (RELIC-336) ([#61](https://github.com/nebulord-dev/gitrelic/issues/61)) ([314f5f6](https://github.com/nebulord-dev/gitrelic/commit/314f5f694262a6aeac7b46944d3781c2aa592bb7))

# [0.34.0](https://github.com/nebulord-dev/gitrelic/compare/v0.33.0...v0.34.0) (2026-05-02)


### Features

* **web:** tailwind migration PR2 — shared + layout (RELIC-336) ([#60](https://github.com/nebulord-dev/gitrelic/issues/60)) ([75f1f55](https://github.com/nebulord-dev/gitrelic/commit/75f1f55d253ea80db3513fd6bb7ec0bc6bd530be))

# [0.33.0](https://github.com/nebulord-dev/gitrelic/compare/v0.32.0...v0.33.0) (2026-05-01)


### Features

* **web:** tailwind foundation + NarrativeKPI canary (RELIC-336) ([#59](https://github.com/nebulord-dev/gitrelic/issues/59)) ([41a4b42](https://github.com/nebulord-dev/gitrelic/commit/41a4b4259ddbeacd513758ff7c99dc8f97112d9b))

# [0.32.0](https://github.com/nebulord-dev/gitrelic/compare/v0.31.0...v0.32.0) (2026-05-01)


### Features

* **web:** bus-factor polish — distribution hero + author-centric narrative-KPI (RELIC-304) ([#58](https://github.com/nebulord-dev/gitrelic/issues/58)) ([3926fd3](https://github.com/nebulord-dev/gitrelic/commit/3926fd321f4ad847828028712f560816c0bb5663))

# [0.31.0](https://github.com/nebulord-dev/gitrelic/compare/v0.30.0...v0.31.0) (2026-05-01)


### Features

* **docs:** update polish-pattern with shipped status for churn and forensics analyzers ([9760314](https://github.com/nebulord-dev/gitrelic/commit/9760314a1aa239f3ce7c125ecb2c500c5e7267a1))

# [0.30.0](https://github.com/nebulord-dev/gitrelic/compare/v0.29.0...v0.30.0) (2026-04-30)


### Features

* **web:** rewrite-ratio polish — formula + heroes + narrative-KPI (RELIC-314) ([#57](https://github.com/nebulord-dev/gitrelic/issues/57)) ([9790ff2](https://github.com/nebulord-dev/gitrelic/commit/9790ff283290489d7c470ff5511778d522b7adde)), closes [hi#rewrite](https://github.com/hi/issues/rewrite) [hi#rewrite](https://github.com/hi/issues/rewrite)

# [0.29.0](https://github.com/nebulord-dev/gitrelic/compare/v0.28.0...v0.29.0) (2026-04-30)


### Features

* **web:** NarrativeKPI responsive side-by-side layout (RELIC-334) ([#56](https://github.com/nebulord-dev/gitrelic/issues/56)) ([8f10210](https://github.com/nebulord-dev/gitrelic/commit/8f102101e42d0487ab1f1dd3fdab21b966a255d9))

# [0.28.0](https://github.com/nebulord-dev/gitrelic/compare/v0.27.0...v0.28.0) (2026-04-29)


### Features

* **web:** shame polish — trend hero + KPI panel ([#55](https://github.com/nebulord-dev/gitrelic/issues/55)) ([36ee21b](https://github.com/nebulord-dev/gitrelic/commit/36ee21b6f7364c5be73b3b15c7350329390b15f6)), closes [hi#shame](https://github.com/hi/issues/shame) [hi#shame](https://github.com/hi/issues/shame)

# [0.27.0](https://github.com/nebulord-dev/gitrelic/compare/v0.26.1...v0.27.0) (2026-04-29)


### Features

* **web:** blast-radius polish — histogram hero + narrative-KPI panel + docs (RELIC-315) ([#53](https://github.com/nebulord-dev/gitrelic/issues/53)) ([3facc73](https://github.com/nebulord-dev/gitrelic/commit/3facc733e00ecfac935621cdd0b1c8b50576298f)), closes [hi#blast](https://github.com/hi/issues/blast) [hi#blast](https://github.com/hi/issues/blast) [hi#blast](https://github.com/hi/issues/blast) [hi#blast](https://github.com/hi/issues/blast) [zero-hi#blast](https://github.com/zero-hi/issues/blast) [hi#blast](https://github.com/hi/issues/blast) [hi#blast](https://github.com/hi/issues/blast) [hi#blast](https://github.com/hi/issues/blast)

## [0.26.1](https://github.com/nebulord-dev/gitrelic/compare/v0.26.0...v0.26.1) (2026-04-29)


### Bug Fixes

* **deps:** update postcss and uuid dependencies to resolve compatibility issues ([f9beaf0](https://github.com/nebulord-dev/gitrelic/commit/f9beaf0ed313a8ae2a263cb4972fede4cb6c5d97))

# [0.26.0](https://github.com/nebulord-dev/gitrelic/compare/v0.25.0...v0.26.0) (2026-04-28)


### Features

* directory rollup, source/test split, docs (RELIC-303) ([#52](https://github.com/nebulord-dev/gitrelic/issues/52)) ([a052f14](https://github.com/nebulord-dev/gitrelic/commit/a052f147189d804860f4eb4eb3c8548020eee470))

# [0.25.0](https://github.com/nebulord-dev/gitrelic/compare/v0.24.0...v0.25.0) (2026-04-28)


### Features

* **web:** lift narrative-KPI into shared component (RELIC-332) ([#51](https://github.com/nebulord-dev/gitrelic/issues/51)) ([edbb087](https://github.com/nebulord-dev/gitrelic/commit/edbb087aef5c38ceb7c8629b575015e130fa4953))

# [0.24.0](https://github.com/nebulord-dev/gitrelic/compare/v0.23.0...v0.24.0) (2026-04-27)


### Bug Fixes

* **web:** correct ChurnLegend threshold ranges ([2c2e089](https://github.com/nebulord-dev/gitrelic/commit/2c2e0894247589afe44824415dd59c8fbb2863bd))
* **web:** right-ellipsis basenames + severity-tint trailing label ([7df07b1](https://github.com/nebulord-dev/gitrelic/commit/7df07b1392c8562b6e0d548a347885fa1252e230))


### Features

* **web:** add churnCategoryDescription helper ([f3c1d13](https://github.com/nebulord-dev/gitrelic/commit/f3c1d13fb6dc41bf3c1c77789a65d78c9faa1b8a))
* **web:** add ChurnLegend shared component ([ac15bdd](https://github.com/nebulord-dev/gitrelic/commit/ac15bddbeccd513ffd5d4f6bab13b14bf5475aee))
* **web:** authors tooltip in ChurnTab ([d15c247](https://github.com/nebulord-dev/gitrelic/commit/d15c247c6b732e9cec6874624d311749f1571f4c))
* **web:** clarify churn metric tile copy ([81bf7ac](https://github.com/nebulord-dev/gitrelic/commit/81bf7ac8d63235823170f08afec76d31f7b0f7c5))
* **web:** differentiated Churn treemap (sizeBy=commits) ([7d19669](https://github.com/nebulord-dev/gitrelic/commit/7d1966917b31c07fe46e3ee43b903323cc2ed8dc))
* **web:** mount ChurnLegend + describe categories in tooltip ([b99601f](https://github.com/nebulord-dev/gitrelic/commit/b99601f53128c2965ce44373070154ec25e75066))
* **web:** per-preset hero label + Churn empty-state copy ([aca0328](https://github.com/nebulord-dev/gitrelic/commit/aca0328e9e9b4f710ab4d45da8f446299a936287))
* **web:** see-also footer on ChurnTab ([4519bd9](https://github.com/nebulord-dev/gitrelic/commit/4519bd9b5438f5623021f21ecca94a98b4180243))

# [0.23.0](https://github.com/nebulord-dev/gitrelic/compare/v0.22.0...v0.23.0) (2026-04-26)


### Bug Fixes

* **web:** pluralize 'commit/commits' in ChurnBar trailing label ([25bbf49](https://github.com/nebulord-dev/gitrelic/commit/25bbf495878f9d561048acc2406c893975e596da))
* **web:** restore spec-correct churn metrics + add missing tests ([61be02e](https://github.com/nebulord-dev/gitrelic/commit/61be02eca4b3afde49278717b180fa7193a5bfde))


### Features

* **web:** add churn types to presets/types ([2a7d0c7](https://github.com/nebulord-dev/gitrelic/commit/2a7d0c7db3a8db5c0d5a69aa6e3c8f2c47161bc4))
* **web:** add ChurnBar hero component ([0a7072b](https://github.com/nebulord-dev/gitrelic/commit/0a7072b911b6d29754edea33bb17a8a35084889c))
* **web:** add ChurnTab bottom-panel table ([50632ca](https://github.com/nebulord-dev/gitrelic/commit/50632ca0f384d356f0417c9f2c22ab38c1428a38))
* **web:** wire churn preset into registry, sidebar, BottomPanel, Shell ([ea390cc](https://github.com/nebulord-dev/gitrelic/commit/ea390cc57d1dfcc9df208460a758a56d50e5bfb7))

# [0.22.0](https://github.com/nebulord-dev/gitrelic/compare/v0.21.0...v0.22.0) (2026-04-26)


### Features

* **web:** polish Bus Factor heatmap viz (RiskHeatmap) ([9605175](https://github.com/nebulord-dev/gitrelic/commit/9605175c6751df777ff8b93d00e6d57fa2180afd))
* **web:** polish Bus Factor hero (OwnershipBar) ([0f06365](https://github.com/nebulord-dev/gitrelic/commit/0f063658469176f0efa8b4af834ece940c617533)), closes [hi#impact](https://github.com/hi/issues/impact)
* **web:** polish Bus Factor ownership viz (OwnershipBubble) ([961c215](https://github.com/nebulord-dev/gitrelic/commit/961c2159f6fbb83018fbb13c3aa93e94134d6f37))
* **web:** uncap analyzer tab tables and show full file lists ([223a30e](https://github.com/nebulord-dev/gitrelic/commit/223a30ef990a2dfcf3c23d48662373478cee5cec))

# [0.21.0](https://github.com/nebulord-dev/gitrelic/compare/v0.20.0...v0.21.0) (2026-04-25)


### Features

* **web:** bespoke hero for test-coverage (by-directory bar) ([#47](https://github.com/nebulord-dev/gitrelic/issues/47)) ([f3bac5e](https://github.com/nebulord-dev/gitrelic/commit/f3bac5ef74026e69ed2c6c9eb3eec7e3c07e5709)), closes [#40](https://github.com/nebulord-dev/gitrelic/issues/40) [#d27b22](https://github.com/nebulord-dev/gitrelic/issues/d27b22)

# [0.20.0](https://github.com/nebulord-dev/gitrelic/compare/v0.19.0...v0.20.0) (2026-04-25)


### Features

* **web:** bespoke hero for languages (stacked bar by directory) ([#46](https://github.com/nebulord-dev/gitrelic/issues/46)) ([a06d024](https://github.com/nebulord-dev/gitrelic/commit/a06d0243dbc96607b5c904f31a4154a684955848))

# [0.19.0](https://github.com/nebulord-dev/gitrelic/compare/v0.18.0...v0.19.0) (2026-04-25)


### Features

* **web:** bespoke hero for blast-radius (blast-scatter) ([#45](https://github.com/nebulord-dev/gitrelic/issues/45)) ([51aa6ef](https://github.com/nebulord-dev/gitrelic/commit/51aa6efb3f1ca5ab8bac3c5c42933ddd1c1f28ed)), closes [#d27b22](https://github.com/nebulord-dev/gitrelic/issues/d27b22) [hi#cascade-risk](https://github.com/hi/issues/cascade-risk) [#44](https://github.com/nebulord-dev/gitrelic/issues/44)

# [0.18.0](https://github.com/nebulord-dev/gitrelic/compare/v0.17.0...v0.18.0) (2026-04-25)


### Features

* **web:** bespoke hero for dead-code (staleness-scatter) ([#44](https://github.com/nebulord-dev/gitrelic/issues/44)) ([1543423](https://github.com/nebulord-dev/gitrelic/commit/1543423262c7da8887b4d4068aebc5ccfb3ced8d)), closes [#d27b22](https://github.com/nebulord-dev/gitrelic/issues/d27b22) [hi#risk](https://github.com/hi/issues/risk)

# [0.17.0](https://github.com/nebulord-dev/gitrelic/compare/v0.16.0...v0.17.0) (2026-04-25)


### Features

* **web:** bespoke hero for rewrite-ratio (diverging bar) ([#43](https://github.com/nebulord-dev/gitrelic/issues/43)) ([49560bd](https://github.com/nebulord-dev/gitrelic/commit/49560bd19f18e3520280543247fd05ddf24d7c36))

# [0.16.0](https://github.com/nebulord-dev/gitrelic/compare/v0.15.0...v0.16.0) (2026-04-25)


### Features

* **web:** bespoke hero for bus-factor (ownership-bar) ([#42](https://github.com/nebulord-dev/gitrelic/issues/42)) ([fcda7d3](https://github.com/nebulord-dev/gitrelic/commit/fcda7d33927c0f3d730c74bcf5dd4e2224292266))

# [0.15.0](https://github.com/nebulord-dev/gitrelic/compare/v0.14.0...v0.15.0) (2026-04-25)


### Features

* **web:** bespoke hero for knowledge-silos (single-author sunburst mode) ([#41](https://github.com/nebulord-dev/gitrelic/issues/41)) ([0318937](https://github.com/nebulord-dev/gitrelic/commit/0318937ec47bc70e078e12f40c851b398bbf19ea))

# [0.14.0](https://github.com/nebulord-dev/gitrelic/compare/v0.13.1...v0.14.0) (2026-04-25)


### Features

* **web:** treemap colorBy modes — Pass 1 of hero differentiation ([#40](https://github.com/nebulord-dev/gitrelic/issues/40)) ([f0b216a](https://github.com/nebulord-dev/gitrelic/commit/f0b216a533991bf66516dd8b3d08ec023cd08243))

## [0.13.1](https://github.com/nebulord-dev/gitrelic/compare/v0.13.0...v0.13.1) (2026-04-24)


### Bug Fixes

* **web:** disambiguate same-basename sankey nodes by path suffix ([#38](https://github.com/nebulord-dev/gitrelic/issues/38)) ([d5e3948](https://github.com/nebulord-dev/gitrelic/commit/d5e3948837c5c84174f2712f438f4c2ef238402d)), closes [throu#prepareSankeyData](https://github.com/throu/issues/prepareSankeyData)

# [0.13.0](https://github.com/nebulord-dev/gitrelic/compare/v0.12.0...v0.13.0) (2026-04-24)


### Features

* **web:** add Renames Tier 2 preset ([#37](https://github.com/nebulord-dev/gitrelic/issues/37)) ([d91549b](https://github.com/nebulord-dev/gitrelic/commit/d91549bb4b805ef9ec93944f494e0b66de313e7c))

# [0.12.0](https://github.com/nebulord-dev/gitrelic/compare/v0.11.0...v0.12.0) (2026-04-24)


### Features

* **web:** add Shame Tier 2 preset ([#36](https://github.com/nebulord-dev/gitrelic/issues/36)) ([0fed54a](https://github.com/nebulord-dev/gitrelic/commit/0fed54a1e015bc59e1c3477a8e9503429eea5920))

# [0.11.0](https://github.com/nebulord-dev/gitrelic/compare/v0.10.0...v0.11.0) (2026-04-24)


### Features

* **web:** add Co-Authors Tier 2 preset (Wave D) ([#35](https://github.com/nebulord-dev/gitrelic/issues/35)) ([dc5fadb](https://github.com/nebulord-dev/gitrelic/commit/dc5fadbf1a33fb809b7228040552dc1fc591cc6f))

# [0.10.0](https://github.com/nebulord-dev/gitrelic/compare/v0.9.0...v0.10.0) (2026-04-24)


### Features

* **web:** add Ghost Files Tier 2 preset ([#34](https://github.com/nebulord-dev/gitrelic/issues/34)) ([5fbd0fb](https://github.com/nebulord-dev/gitrelic/commit/5fbd0fb6c4c535346247239c682050135046609b))

# [0.9.0](https://github.com/nebulord-dev/gitrelic/compare/v0.8.0...v0.9.0) (2026-04-23)


### Features

* **web:** add Commit Timing Tier 2 preset (Wave C) ([#33](https://github.com/nebulord-dev/gitrelic/issues/33)) ([8f38681](https://github.com/nebulord-dev/gitrelic/commit/8f386819b6cb5a72547fc49fd9686a590b8000c1))

# [0.8.0](https://github.com/nebulord-dev/gitrelic/compare/v0.7.0...v0.8.0) (2026-04-23)


### Features

* **web:** add Wave B Tier 2 presets (4 presets + Structure group) ([#32](https://github.com/nebulord-dev/gitrelic/issues/32)) ([4cdcdea](https://github.com/nebulord-dev/gitrelic/commit/4cdcdeae784a431f545eb7f474fe58c3ab60f8fe))

# [0.7.0](https://github.com/nebulord-dev/gitrelic/compare/v0.6.0...v0.7.0) (2026-04-23)


### Features

* **web:** add Wave A Tier 2 presets (5 presets) ([#31](https://github.com/nebulord-dev/gitrelic/issues/31)) ([91b3b7b](https://github.com/nebulord-dev/gitrelic/commit/91b3b7bf69507edfeb47fb2f0d1de4e965e9ab50)), closes [#30](https://github.com/nebulord-dev/gitrelic/issues/30)

# [0.6.0](https://github.com/nebulord-dev/gitrelic/compare/v0.5.1...v0.6.0) (2026-04-23)


### Features

* **web:** add Cursed Files Tier 2 preset ([#30](https://github.com/nebulord-dev/gitrelic/issues/30)) ([5d9aa24](https://github.com/nebulord-dev/gitrelic/commit/5d9aa242f45052c55eb352d06aacc01457eed452))

## [0.5.1](https://github.com/nebulord-dev/gitrelic/compare/v0.5.0...v0.5.1) (2026-04-23)


### Bug Fixes

* **web:** preset framework follow-ups from PR [#28](https://github.com/nebulord-dev/gitrelic/issues/28) review ([#29](https://github.com/nebulord-dev/gitrelic/issues/29)) ([564e6bf](https://github.com/nebulord-dev/gitrelic/commit/564e6bff2e4585ffe57abb13111115bdb9016b63))

# [0.5.0](https://github.com/nebulord-dev/gitrelic/compare/v0.4.1...v0.5.0) (2026-04-23)


### Features

* **web:** analyzer preset framework + 4 Tier 2 presets ([#28](https://github.com/nebulord-dev/gitrelic/issues/28)) ([321b0c6](https://github.com/nebulord-dev/gitrelic/commit/321b0c6d95d9794a76089f228a1cc5b065bfa368))

## [0.4.1](https://github.com/nebulord-dev/gitrelic/compare/v0.4.0...v0.4.1) (2026-04-23)


### Bug Fixes

* update icons in top bar ([b5be81a](https://github.com/nebulord-dev/gitrelic/commit/b5be81adf49ebd370ff3e3abbeeb11df370caf64))

# [0.4.0](https://github.com/nebulord-dev/gitrelic/compare/v0.3.0...v0.4.0) (2026-04-23)


### Features

* **web:** focus mode ([#27](https://github.com/nebulord-dev/gitrelic/issues/27)) ([9ba3b22](https://github.com/nebulord-dev/gitrelic/commit/9ba3b226f7d8e7a665985352c5b0195b3095669c))

# [0.3.0](https://github.com/nebulord-dev/gitrelic/compare/v0.2.0...v0.3.0) (2026-04-18)


### Features

* UI polish batch — version, date range, stale files, theme toggle ([#22](https://github.com/nebulord-dev/gitrelic/issues/22)) ([1519867](https://github.com/nebulord-dev/gitrelic/commit/1519867d1761667eb1eb7c655ff5ba112ca0bee3))

# [0.2.0](https://github.com/nebulord-dev/gitrelic/compare/v0.1.0...v0.2.0) (2026-04-18)


### Features

* add branch name to the header ([#21](https://github.com/nebulord-dev/gitrelic/issues/21)) ([6f7eef9](https://github.com/nebulord-dev/gitrelic/commit/6f7eef9593642db877ddacfb9a058cca72557366))

# Changelog

## 0.1.0

Initial release as `gitrelic`.

This project was previously published as `gitlore` (v1.0.0–v1.5.0). The name was changed because two unrelated projects already ship under the `gitlore` name on npm. History and versioning were reset to reflect this as a pre-alpha baseline under the new identity. The old `gitlore` package on npm is deprecated and points here.
