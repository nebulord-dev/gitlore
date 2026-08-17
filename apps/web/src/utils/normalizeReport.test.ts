import { describe, expect, it } from 'vitest';

import { normalizeReport } from './normalizeReport';

describe('normalizeReport', () => {
  it('defaults testCoverage.files to empty array when raw report omits it', () => {
    const raw = {
      testCoverage: {
        directories: [],
        uncoveredDirectories: [],
        overallRatio: 0,
        summary: 'old report',
      },
    };
    const out = normalizeReport(raw as any);
    expect(out.testCoverage.files).toEqual([]);
  });

  it('preserves testCoverage.files when present', () => {
    const raw = {
      testCoverage: {
        directories: [],
        uncoveredDirectories: [],
        files: [{ file: 'a.ts', hasTestSibling: true }],
        overallRatio: 0,
        summary: '',
      },
    };
    const out = normalizeReport(raw as any);
    expect(out.testCoverage.files).toHaveLength(1);
    expect(out.testCoverage.files[0].hasTestSibling).toBe(true);
  });

  it('defaults entire testCoverage when missing', () => {
    const out = normalizeReport({} as any);
    expect(out.testCoverage.files).toEqual([]);
    expect(out.testCoverage.directories).toEqual([]);
  });

  it('fills empty defaults for new forensics aggregates on older reports', () => {
    const result = normalizeReport({});
    expect(result.forensics.keywordTiers).toEqual({
      critical: 0,
      moderate: 0,
      mild: 0,
    });
    expect(result.forensics.byMonth).toEqual([]);
  });

  it('fills ageMap.thresholds from meta.ageInDays when the field is absent (older report)', () => {
    const result = normalizeReport({
      meta: { ageInDays: 365 } as never,
      ageMap: {
        files: [],
        staleFiles: [],
        ancientFiles: [],
        medianAgeDays: 0,
        summary: '',
      } as never,
    });
    expect(result.ageMap.thresholds).toEqual({
      freshLimit: 29,
      agingLimit: 120,
      staleLimit: 241,
    });
  });

  it('preserves ageMap.thresholds from a fresh report and does not overwrite', () => {
    const result = normalizeReport({
      meta: { ageInDays: 100 } as never,
      ageMap: {
        files: [],
        staleFiles: [],
        ancientFiles: [],
        medianAgeDays: 0,
        thresholds: { freshLimit: 8, agingLimit: 33, staleLimit: 66 },
        summary: '',
      } as never,
    });
    expect(result.ageMap.thresholds).toEqual({
      freshLimit: 8,
      agingLimit: 33,
      staleLimit: 66,
    });
  });

  it('fills empty defaults for new contributors aggregates on a pre-RELIC-306 contributors object', () => {
    // Simulate a report generated before top3CommitShare and newcomers90d landed:
    // contributors exists but lacks the two new fields. The previous object-level
    // ?? fallback would skip them, leaving them undefined. Field-level defaults
    // must rescue them.
    const result = normalizeReport({
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
        summary: 'old report',
      } as never,
    });

    expect(result.contributors.top3CommitShare).toBe(0);
    expect(result.contributors.newcomers90d).toBe(0);
  });

  it('preserves contributors aggregates from a fresh report and does not overwrite', () => {
    const result = normalizeReport({
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
        top3CommitShare: 67.5,
        newcomers90d: 4,
      } as never,
    });
    expect(result.contributors.top3CommitShare).toBe(67.5);
    expect(result.contributors.newcomers90d).toBe(4);
  });

  it('fills empty defaults for new commit-timing aggregates on a pre-0.40 commitTiming object', () => {
    // Simulate a report from GitRelic ≤ 0.39: commitTiming exists but lacks the
    // new aggregates added in 0.40 (repoHourDayMatrix, highStress, tierMix,
    // byMonth, authorStress). The object-level ?? fallback would skip these,
    // leaving them undefined. Field-level defaults must rescue them.
    const result = normalizeReport({
      commitTiming: {
        files: [],
        stressFiles: [],
        repoLateNightPercent: 0,
        repoWeekendPercent: 0,
        summary: 'old report',
      } as never,
    });

    expect(result.commitTiming.repoHourDayMatrix).toHaveLength(7);
    for (const row of result.commitTiming.repoHourDayMatrix) {
      expect(row).toHaveLength(24);
      expect(row.every((cell) => cell === 0)).toBe(true);
    }
    expect(result.commitTiming.highStress).toBe(0);
    expect(result.commitTiming.tierMix).toEqual({
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    });
    expect(result.commitTiming.byMonth).toEqual([]);
    expect(result.commitTiming.authorStress).toEqual([]);
  });

  it('fills empty defaults for new co-author aggregates on a pre-0.45 coAuthors object', () => {
    // Simulate a report from GitRelic ≤ 0.44: coAuthors exists but lacks the
    // new aggregates added in 0.45 (aiAssistedCommits, humanAuthoredCommits,
    // aiAdoptionPercent, aiAdoptionTier, aiAuthors, humanPairs,
    // filteredBotCommits, byMonth, perAuthorMix). The object-level ?? fallback
    // would skip these, leaving them undefined. Field-level defaults must
    // rescue them.
    const result = normalizeReport({
      coAuthors: {
        pairs: [],
        authorStats: [],
        totalCoAuthoredCommits: 0,
        summary: 'old report',
      } as never,
    });

    expect(result.coAuthors.aiAssistedCommits).toBe(0);
    expect(result.coAuthors.humanAuthoredCommits).toBe(0);
    expect(result.coAuthors.aiAdoptionPercent).toBe(0);
    expect(result.coAuthors.aiAdoptionTier).toBe('none');
    expect(result.coAuthors.aiAuthors).toEqual([]);
    expect(result.coAuthors.humanPairs).toEqual([]);
    expect(result.coAuthors.filteredBotCommits).toBe(0);
    expect(result.coAuthors.byMonth).toEqual([]);
    expect(result.coAuthors.perAuthorMix).toEqual([]);
  });

  // cursedFiles changed from CursedFile[] to CursedFilesReport in RELIC-307.
  // This lift is the entire backward-compat story for every report written
  // before that, so both directions are pinned here.
  it('lifts a pre-RELIC-307 cursedFiles array into a report object', () => {
    const raw = {
      cursedFiles: [
        {
          file: 'a.ts',
          curseScore: 80,
          reasons: ['Modified in 40% of all commits'],
          churn: 12,
          authors: 1,
          ageDays: 30,
          narrative: 'a.ts is a problem.',
        },
      ],
    };

    const out = normalizeReport(raw as any);
    expect(out.cursedFiles.files).toHaveLength(1);
    expect(out.cursedFiles.files[0].file).toBe('a.ts');
    // Old reports predate bot filtering, so nothing was withheld when written.
    expect(out.cursedFiles.excludedBotFiles).toEqual([]);
  });

  it('preserves a fresh cursedFiles report object', () => {
    const raw = {
      cursedFiles: {
        files: [
          {
            file: 'b.ts',
            curseScore: 60,
            reasons: [],
            churn: 5,
            authors: 2,
            ageDays: 10,
            narrative: '',
          },
        ],
        excludedBotFiles: ['CHANGELOG.md'],
        summary: '1 cursed file. 1 file withheld as machine-generated churn.',
      },
    };

    const out = normalizeReport(raw as any);
    expect(out.cursedFiles.files).toHaveLength(1);
    expect(out.cursedFiles.excludedBotFiles).toEqual(['CHANGELOG.md']);
    expect(out.cursedFiles.summary).toContain('withheld');
  });

  it('defaults cursedFiles entirely when the field is missing', () => {
    const out = normalizeReport({} as any);
    expect(out.cursedFiles.files).toEqual([]);
    expect(out.cursedFiles.excludedBotFiles).toEqual([]);
  });
});
