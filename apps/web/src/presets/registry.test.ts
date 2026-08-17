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
});
