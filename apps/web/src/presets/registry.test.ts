import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { PRESETS } from './registry';
import type { PresetDefinition, PresetId } from './types';
import type { GitrelicReport } from '@gitrelic/core';

// Minimal report fixture for metrics() invocation. Expand as new metric functions need it.
function makeReport(): GitrelicReport {
  return {
    meta: { totalAuthors: 5, ageInDays: 365 },
    churn: { files: [], topFiles: [], hotspotCount: 0, summary: '' },
    contributors: {
      contributors: [],
      activeContributors: [],
      ghostContributors: [],
      topContributor: {
        email: '',
        name: '',
        commitCount: 0,
        firstCommit: '',
        lastCommit: '',
        filesOwned: 0,
        linesChanged: 0,
        activeDays: 0,
        focusAreas: [],
        isActive: false,
        isGhost: false,
      },
      summary: '',
      top3CommitShare: 0,
      newcomers90d: 0,
    },
    loc: {
      totalFiles: 10,
      totalLines: 1000,
      files: [],
      languages: [],
      summary: '',
    },
    hotspots: { files: [], topHotspots: [], summary: '' },
    cursedFiles: { files: [], excludedBotFiles: [], summary: '' },
    busFactors: { criticalFiles: [] },
    coupling: { pairs: [], topPairs: [], fileProfiles: [], summary: '' },
    deadCode: { totalDeadFiles: 0, totalDeadLines: 0, candidates: [] },
    ghostFiles: {
      files: [],
      totalGhostFiles: 0,
      ghostOwners: 0,
      ghostLoc: 0,
      tierMix: { trueGhost: 0, fading: 0 },
    },
    knowledgeConcentration: {
      singleAuthorFiles: 0,
      totalFiles: 0,
      concentrationIndex: 0,
    },
    parallelDev: {
      files: [],
      hotFiles: [],
      totalParallelFiles: 0,
      highParallel: 0,
      tierMix: { low: 0, medium: 0, high: 0, critical: 0 },
      byMonth: [],
      summary: '',
    },
    ageMap: { files: [], staleFiles: [], ancientFiles: [], medianAgeDays: 0 },
    testCoverage: {
      directories: [],
      uncoveredDirectories: [],
      overallRatio: 0,
    },
    blastRadius: { files: [], topBlasters: [] },
    complexityTrend: { files: [], growingFiles: [], shrinkingFiles: [] },
    rewriteRatio: {
      files: [],
      topRewriters: [],
      totalInsertions: 0,
      totalDeletions: 0,
      highRewrite: 0,
    },
    churnVelocity: { acceleratingFiles: [] },
    commitTiming: {
      files: [],
      stressFiles: [],
      repoLateNightPercent: 0,
      repoWeekendPercent: 0,
      summary: '',
      repoHourDayMatrix: Array.from({ length: 7 }, () =>
        Array.from({ length: 24 }, () => 0),
      ),
      highStress: 0,
      tierMix: { low: 0, medium: 0, high: 0, critical: 0 },
      byMonth: [],
      authorStress: [],
    },
    coAuthors: {
      pairs: [],
      authorStats: [],
      totalCoAuthoredCommits: 0,
      summary: '',
      aiAssistedCommits: 0,
      humanAuthoredCommits: 0,
      aiAdoptionPercent: 0,
      aiAdoptionTier: 'none',
      aiAuthors: [],
      humanPairs: [],
      filteredBotCommits: 0,
      byMonth: [],
      perAuthorMix: [],
    },
    forensics: {
      files: [],
      shameLeaderboard: [],
      totalShameCommits: 0,
      summary: '',
    },
    renameTracking: {
      renames: [],
      chains: [],
      totalRenames: 0,
      filesWithRenames: 0,
      summary: '',
    },
  } as unknown as GitrelicReport;
}

const DEFINED_PRESETS = (
  Object.entries(PRESETS) as [PresetId, PresetDefinition | undefined][]
)
  .filter(([, def]) => def !== undefined)
  .map(([id, def]) => ({ id, def: def as PresetDefinition }));

describe('PRESETS registry contract', () => {
  it.each(DEFINED_PRESETS)(
    '$id: defaultViz is included in hero.altTabs',
    ({ def }) => {
      expect(def.hero.altTabs).toContain(def.hero.defaultViz);
    },
  );

  it.each(DEFINED_PRESETS)(
    '$id: defaultTab is included in bottomPanel.altTabs',
    ({ def }) => {
      expect(def.bottomPanel.altTabs).toContain(def.bottomPanel.defaultTab);
    },
  );

  it.each(DEFINED_PRESETS)('$id: metrics returns 1 to 5 entries', ({ def }) => {
    const result = def.metrics(makeReport());
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it.each(DEFINED_PRESETS)(
    '$id: id field matches the registry key',
    ({ id, def }) => {
      expect(def.id).toBe(id);
    },
  );

  it('includes all three Tier 1 presets', () => {
    const tier1Ids = DEFINED_PRESETS.filter(
      ({ def }) => def.tier === 'dashboard',
    ).map(({ id }) => id);
    expect(tier1Ids).toEqual(
      expect.arrayContaining(['overview', 'risk', 'tech-debt']),
    );
  });
});

describe('analyzer docsPath', () => {
  const BACKFILLED: Array<{ id: PresetId; docsPath: string }> = [
    { id: 'age-map', docsPath: 'analyzers/age-map' },
    { id: 'blast-radius', docsPath: 'analyzers/blast-radius' },
    { id: 'bus-factor', docsPath: 'analyzers/bus-factor' },
    { id: 'churn', docsPath: 'analyzers/churn' },
    { id: 'commit-timing', docsPath: 'analyzers/commit-timing' },
    { id: 'parallel-dev', docsPath: 'analyzers/parallel-dev' },
    { id: 'rewrite-ratio', docsPath: 'analyzers/rewrite-ratio' },
    { id: 'shame', docsPath: 'analyzers/shame' },
  ];

  const DOCS_DIR = join(__dirname, '../../../docs/analyzers');

  it.each(BACKFILLED)(
    'preset $id has docsPath $docsPath',
    ({ id, docsPath }) => {
      expect(PRESETS[id].docsPath).toBe(docsPath);
    },
  );

  it('every docsPath value resolves to a real docs file', () => {
    for (const preset of Object.values(PRESETS)) {
      if (preset.docsPath === undefined) continue;
      const slug = preset.docsPath.replace(/^analyzers\//, '');
      const filePath = join(DOCS_DIR, `${slug}.md`);
      expect(
        existsSync(filePath),
        `missing docs file: ${filePath} (referenced by preset ${preset.id})`,
      ).toBe(true);
    }
  });

  it('every analyzer-tier preset whose <id>.md exists must set docsPath', () => {
    for (const preset of Object.values(PRESETS)) {
      if (preset.tier !== 'analyzer') continue;
      const expectedDocPath = join(DOCS_DIR, `${preset.id}.md`);
      if (existsSync(expectedDocPath)) {
        expect(
          preset.docsPath,
          `preset ${preset.id} has a docs page on disk but no docsPath set — see polish-pattern.md`,
        ).toBeDefined();
      }
    }
  });

  /**
   * Analyzers still awaiting their Polish Initiative pass, and therefore
   * legitimately without a docs page. Remove an entry when its page lands.
   *
   * This is the backlog, encoded. Mirrors `ignoreDeadLinks` in the VitePress
   * config, which carries the same list for the same reason and instructs you
   * to drop entries as pages arrive.
   */
  const AWAITING_POLISH: PresetId[] = [
    'complexity-trend',
    'coupling',
    'dead-code',
    'hotspots',
    'knowledge-silos',
    'languages',
    'test-coverage',
  ];

  it('every analyzer-tier preset has docsPath, except those awaiting polish', () => {
    // Deliberately an exact match rather than a subset check, so the list
    // cannot rot in either direction: forgetting docsPath on a newly polished
    // analyzer fails here, and so does documenting one without removing it
    // from the list. The existing "page on disk implies docsPath" assertion
    // above short-circuits when there is no page at all — which is precisely
    // how RELIC-307 shipped with neither a page nor a docsPath and stayed
    // green.
    const undocumented = Object.values(PRESETS)
      .filter((p) => p.tier === 'analyzer' && p.docsPath === undefined)
      .map((p) => p.id)
      .sort();

    expect(
      undocumented,
      'analyzer presets without docsPath drifted from AWAITING_POLISH — add the docsPath, or drop the entry once its page ships',
    ).toEqual([...AWAITING_POLISH].sort());
  });

  it('nothing in AWAITING_POLISH already has a docs page on disk', () => {
    // Stops the list being used to silence a real gap: if the page exists, the
    // analyzer is not awaiting polish and the entry must go.
    for (const id of AWAITING_POLISH) {
      expect(
        existsSync(join(DOCS_DIR, `${id}.md`)),
        `${id} is listed as awaiting polish but already has a docs page — remove it from AWAITING_POLISH and set docsPath`,
      ).toBe(false);
    }
  });
});
