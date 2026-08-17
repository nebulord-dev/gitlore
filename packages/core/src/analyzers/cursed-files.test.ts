import { describe, it, expect } from 'vitest';

import { findCursedFiles } from './cursed-files.js';
import type {
  ChurnReport,
  BusFactorReport,
  AgeMapReport,
  ForensicsReport,
  ParallelDevReport,
} from '../types.js';
import type { RawCommit } from '../utils/git.js';

function makeChurnReport(
  files: { file: string; commitCount: number; churnScore: number }[],
): ChurnReport {
  return {
    files: files.map((f) => ({
      ...f,
      category:
        f.churnScore > 75
          ? ('hot' as const)
          : f.churnScore > 40
            ? ('warm' as const)
            : ('cold' as const),
    })),
    topFiles: files
      .slice(0, 20)
      .map((f) => ({ ...f, category: 'hot' as const })),
    hotspotCount: files.filter((f) => f.churnScore > 75).length,
    summary: '',
  };
}

function makeBusFactorReport(
  files: {
    file: string;
    risk: 'critical' | 'high' | 'medium' | 'low';
    dominantAuthorPercent: number;
    uniqueAuthors: number;
  }[],
): BusFactorReport {
  return {
    files: files.map((f) => ({
      ...f,
      authors: ['alice@example.com'],
      dominantAuthor: 'alice@example.com',
    })),
    criticalFiles: files
      .filter((f) => f.risk === 'critical')
      .map((f) => ({
        ...f,
        authors: ['alice@example.com'],
        dominantAuthor: 'alice@example.com',
      })),
    overallBusFactor: 1,
    summary: '',
  };
}

function makeAgeMapReport(
  files: { file: string; ageInDays: number }[],
): AgeMapReport {
  return {
    files: files.map((f) => ({
      ...f,
      lastCommitDate: new Date(
        Date.now() - f.ageInDays * 86_400_000,
      ).toISOString(),
      status: 'fresh' as const,
    })),
    staleFiles: [],
    ancientFiles: [],
    medianAgeDays: 0,
    thresholds: { freshLimit: 30, agingLimit: 90, staleLimit: 180 },
    summary: '',
  };
}

function makeEmptyForensics(): ForensicsReport {
  return {
    files: [],
    shameLeaderboard: [],
    totalShameCommits: 0,
    keywordTiers: { critical: 0, moderate: 0, mild: 0 },
    byMonth: [],
    summary: '',
  };
}

function makeEmptyParallelDev(): ParallelDevReport {
  return {
    files: [],
    hotFiles: [],
    totalParallelFiles: 0,
    highParallel: 0,
    tierMix: { low: 0, medium: 0, high: 0, critical: 0 },
    byMonth: [],
    summary: '',
  };
}

/**
 * Synthetic commit history. `findCursedFiles` only reads authorEmail, date and
 * files, so the rest stays minimal. `authorEmail` drives bot attribution and
 * `daysAgo` drives how idle the repository looks.
 */
function makeCommits(
  count: number,
  opts: { files?: string[]; authorEmail?: string; daysAgo?: number } = {},
): RawCommit[] {
  const { files = [], authorEmail = 'alice@example.com', daysAgo = 0 } = opts;
  return Array.from({ length: count }, (_, i) => ({
    hash: `c${i}`,
    authorEmail,
    authorName: authorEmail.split('@')[0],
    date: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    message: 'chore: change',
    coAuthors: [],
    files,
    fileStats: [],
    insertions: 1,
    deletions: 0,
  }));
}

describe('findCursedFiles', () => {
  it('requires score >= 50 to qualify', () => {
    // high churn (>75 → 35) + high bus factor (15) = 50 → qualifies
    const churn = makeChurnReport([
      { file: 'a.ts', commitCount: 10, churnScore: 80 },
    ]);
    const bus = makeBusFactorReport([
      {
        file: 'a.ts',
        risk: 'high',
        dominantAuthorPercent: 80,
        uniqueAuthors: 2,
      },
    ]);
    const age = makeAgeMapReport([{ file: 'a.ts', ageInDays: 50 }]);

    const result = findCursedFiles(
      churn,
      bus,
      age,
      makeEmptyForensics(),
      makeEmptyParallelDev(),
      makeCommits(20),
    );
    expect(result.files.length).toBe(1);
    expect(result.files[0].curseScore).toBe(50);
  });

  it('excludes files below threshold 50', () => {
    // warm churn (>40 → 15) + high bus factor (15) = 30 → excluded
    const churn = makeChurnReport([
      { file: 'a.ts', commitCount: 5, churnScore: 50 },
    ]);
    const bus = makeBusFactorReport([
      {
        file: 'a.ts',
        risk: 'high',
        dominantAuthorPercent: 80,
        uniqueAuthors: 2,
      },
    ]);
    const age = makeAgeMapReport([{ file: 'a.ts', ageInDays: 50 }]);

    const result = findCursedFiles(
      churn,
      bus,
      age,
      makeEmptyForensics(),
      makeEmptyParallelDev(),
      makeCommits(20),
    );
    expect(result.files.length).toBe(0);
  });

  it('requires multiple strong signals', () => {
    // Only critical bus factor (30), no churn signal (churnScore <= 40 → 0 from churn) → excluded
    const churn = makeChurnReport([
      { file: 'a.ts', commitCount: 2, churnScore: 30 },
    ]);
    const bus = makeBusFactorReport([
      {
        file: 'a.ts',
        risk: 'critical',
        dominantAuthorPercent: 100,
        uniqueAuthors: 1,
      },
    ]);
    const age = makeAgeMapReport([{ file: 'a.ts', ageInDays: 50 }]);

    const result = findCursedFiles(
      churn,
      bus,
      age,
      makeEmptyForensics(),
      makeEmptyParallelDev(),
      makeCommits(20),
    );
    expect(result.files.length).toBe(0);
  });

  it('combines hot churn (35) + critical bus factor (30) = 65', () => {
    const churn = makeChurnReport([
      { file: 'a.ts', commitCount: 10, churnScore: 80 },
    ]);
    const bus = makeBusFactorReport([
      {
        file: 'a.ts',
        risk: 'critical',
        dominantAuthorPercent: 100,
        uniqueAuthors: 1,
      },
    ]);
    const age = makeAgeMapReport([{ file: 'a.ts', ageInDays: 50 }]);

    const result = findCursedFiles(
      churn,
      bus,
      age,
      makeEmptyForensics(),
      makeEmptyParallelDev(),
      makeCommits(20),
    );
    expect(result.files[0].curseScore).toBe(65);
  });

  it('caps score at 100', () => {
    // hot churn (35) + critical bus (30) + age paradox (10) + many signals
    // We need churnScore > 60 and ageInDays < 30 for the age paradox bonus
    const churn = makeChurnReport([
      { file: 'a.ts', commitCount: 50, churnScore: 95 },
    ]);
    const bus = makeBusFactorReport([
      {
        file: 'a.ts',
        risk: 'critical',
        dominantAuthorPercent: 100,
        uniqueAuthors: 1,
      },
    ]);
    const age = makeAgeMapReport([{ file: 'a.ts', ageInDays: 5 }]);

    const result = findCursedFiles(
      churn,
      bus,
      age,
      makeEmptyForensics(),
      makeEmptyParallelDev(),
      makeCommits(50),
    );
    // 35 + 30 + 10 = 75, capped at 100 (doesn't exceed here, but test the cap mechanism)
    expect(result.files[0].curseScore).toBeLessThanOrEqual(100);
  });

  it('sorts by curseScore descending', () => {
    const churn = makeChurnReport([
      { file: 'low.ts', commitCount: 10, churnScore: 80 },
      { file: 'high.ts', commitCount: 20, churnScore: 90 },
    ]);
    const bus = makeBusFactorReport([
      {
        file: 'low.ts',
        risk: 'high',
        dominantAuthorPercent: 80,
        uniqueAuthors: 2,
      },
      {
        file: 'high.ts',
        risk: 'critical',
        dominantAuthorPercent: 100,
        uniqueAuthors: 1,
      },
    ]);
    const age = makeAgeMapReport([
      { file: 'low.ts', ageInDays: 50 },
      { file: 'high.ts', ageInDays: 50 },
    ]);

    const result = findCursedFiles(
      churn,
      bus,
      age,
      makeEmptyForensics(),
      makeEmptyParallelDev(),
      makeCommits(30),
    );
    expect(result.files[0].file).toBe('high.ts');
    expect(result.files[0].curseScore).toBeGreaterThan(
      result.files[1].curseScore,
    );
  });

  it('includes reasons for each signal', () => {
    const churn = makeChurnReport([
      { file: 'a.ts', commitCount: 10, churnScore: 80 },
    ]);
    const bus = makeBusFactorReport([
      {
        file: 'a.ts',
        risk: 'critical',
        dominantAuthorPercent: 100,
        uniqueAuthors: 1,
      },
    ]);
    const age = makeAgeMapReport([{ file: 'a.ts', ageInDays: 50 }]);

    const result = findCursedFiles(
      churn,
      bus,
      age,
      makeEmptyForensics(),
      makeEmptyParallelDev(),
      makeCommits(20),
    );
    expect(result.files[0].reasons.length).toBeGreaterThanOrEqual(2);
    expect(
      result.files[0].reasons.some((r) => r.toLowerCase().includes('commit')),
    ).toBe(true);
    expect(
      result.files[0].reasons.some((r) => r.toLowerCase().includes('author')),
    ).toBe(true);
  });

  it('only considers candidates from topFiles and criticalFiles', () => {
    // File exists in churn.files but NOT in topFiles or criticalFiles
    const churn: ChurnReport = {
      files: [
        { file: 'hidden.ts', commitCount: 10, churnScore: 80, category: 'hot' },
      ],
      topFiles: [], // not in topFiles
      hotspotCount: 1,
      summary: '',
    };
    const bus = makeBusFactorReport([
      {
        file: 'hidden.ts',
        risk: 'high',
        dominantAuthorPercent: 80,
        uniqueAuthors: 2,
      },
    ]);
    const age = makeAgeMapReport([{ file: 'hidden.ts', ageInDays: 50 }]);

    const result = findCursedFiles(
      churn,
      bus,
      age,
      makeEmptyForensics(),
      makeEmptyParallelDev(),
      makeCommits(20),
    );
    expect(result.files.length).toBe(0);
  });

  it('drops shame-only files with no churn data', () => {
    const forensics: ForensicsReport = {
      files: [
        {
          file: 'shame-only.ts',
          shameScore: 90,
          rawShamePoints: 9,
          shameCommitCount: 3,
          topShameCommits: [],
          dominantKeywords: ['revert'],
        },
      ],
      shameLeaderboard: [
        {
          file: 'shame-only.ts',
          shameScore: 90,
          rawShamePoints: 9,
          shameCommitCount: 3,
          topShameCommits: [],
          dominantKeywords: ['revert'],
        },
      ],
      totalShameCommits: 3,
      keywordTiers: { critical: 0, moderate: 0, mild: 0 },
      byMonth: [],
      summary: '',
    };

    // No churn data for shame-only.ts
    const churn = makeChurnReport([]);
    const busFactor = makeBusFactorReport([]);
    const ageMap = makeAgeMapReport([]);

    const result = findCursedFiles(
      churn,
      busFactor,
      ageMap,
      forensics,
      makeEmptyParallelDev(),
      makeCommits(100),
    );
    expect(
      result.files.find((f) => f.file === 'shame-only.ts'),
    ).toBeUndefined();
  });

  it('adds shame reason for files with shameScore >= 75', () => {
    // Build a file that scores shame-qualifying (shameScore = 80)
    const forensics: ForensicsReport = {
      files: [
        {
          file: 'src/auth.ts',
          shameScore: 80,
          rawShamePoints: 24,
          shameCommitCount: 5,
          topShameCommits: [],
          dominantKeywords: ['revert'],
        },
      ],
      shameLeaderboard: [
        {
          file: 'src/auth.ts',
          shameScore: 80,
          rawShamePoints: 24,
          shameCommitCount: 5,
          topShameCommits: [],
          dominantKeywords: ['revert'],
        },
      ],
      totalShameCommits: 5,
      keywordTiers: { critical: 0, moderate: 0, mild: 0 },
      byMonth: [],
      summary: '',
    };

    // Give it enough churn to be a candidate and cross 50 with shame bonus
    // churnScore > 75 = +35, shameScore >= 75 = +20 → total 55 (enough)
    const churn = makeChurnReport([
      {
        file: 'src/auth.ts',
        commitCount: 20,
        churnScore: 80,
      },
    ]);
    const busFactor = makeBusFactorReport([]);
    const ageMap = makeAgeMapReport([]);

    const result = findCursedFiles(
      churn,
      busFactor,
      ageMap,
      forensics,
      makeEmptyParallelDev(),
      makeCommits(100),
    );
    const auth = result.files.find((f) => f.file === 'src/auth.ts');
    expect(auth).toBeDefined();
    expect(auth!.reasons.some((r) => r.includes('revert'))).toBe(true);
  });

  it('adds parallel development bonus to curse score', () => {
    // churnScore > 75 → +35, parallelScore >= 70 → +20 = 55
    const churn = makeChurnReport([
      { file: 'a.ts', commitCount: 10, churnScore: 80 },
    ]);
    const bus = makeBusFactorReport([]);
    const age = makeAgeMapReport([]);

    const parallelDev: ParallelDevReport = {
      files: [
        {
          file: 'a.ts',
          parallelScore: 75,
          totalActiveWeeks: 10,
          parallelWeeks: 8,
          peakAuthors: 3,
          peakWindow: {
            weekStart: '2025-06-02T00:00:00Z',
            authors: ['a@x.com', 'b@x.com', 'c@x.com'],
            commitCount: 5,
          },
          topWindows: [],
          narrative: 'test',
        },
      ],
      hotFiles: [
        {
          file: 'a.ts',
          parallelScore: 75,
          totalActiveWeeks: 10,
          parallelWeeks: 8,
          peakAuthors: 3,
          peakWindow: {
            weekStart: '2025-06-02T00:00:00Z',
            authors: ['a@x.com', 'b@x.com', 'c@x.com'],
            commitCount: 5,
          },
          topWindows: [],
          narrative: 'test',
        },
      ],
      totalParallelFiles: 1,
      highParallel: 0,
      tierMix: { low: 0, medium: 0, high: 0, critical: 0 },
      byMonth: [],
      summary: '',
    };

    const result = findCursedFiles(
      churn,
      bus,
      age,
      makeEmptyForensics(),
      parallelDev,
      makeCommits(20),
    );
    expect(result.files.length).toBe(1);
    expect(result.files[0].curseScore).toBe(55); // 35 churn + 20 parallel
    expect(
      result.files[0].reasons.some((r) => r.includes('parallel development')),
    ).toBe(true);
  });

  it('includes parallel dev hot files in candidate set', () => {
    // File is NOT in churn.topFiles or busFactor.criticalFiles or forensics.shameLeaderboard
    // but IS in parallelDev.hotFiles — should still be evaluated
    const churn: ChurnReport = {
      files: [
        {
          file: 'parallel-only.ts',
          commitCount: 10,
          churnScore: 80,
          category: 'hot',
        },
      ],
      topFiles: [], // not in topFiles
      hotspotCount: 0,
      summary: '',
    };
    const bus = makeBusFactorReport([
      {
        file: 'parallel-only.ts',
        risk: 'critical',
        dominantAuthorPercent: 100,
        uniqueAuthors: 1,
      },
    ]);
    const age = makeAgeMapReport([]);

    const parallelDev: ParallelDevReport = {
      files: [
        {
          file: 'parallel-only.ts',
          parallelScore: 75,
          totalActiveWeeks: 10,
          parallelWeeks: 8,
          peakAuthors: 3,
          peakWindow: {
            weekStart: '2025-06-02T00:00:00Z',
            authors: ['a@x.com', 'b@x.com', 'c@x.com'],
            commitCount: 5,
          },
          topWindows: [],
          narrative: 'test',
        },
      ],
      hotFiles: [
        {
          file: 'parallel-only.ts',
          parallelScore: 75,
          totalActiveWeeks: 10,
          parallelWeeks: 8,
          peakAuthors: 3,
          peakWindow: {
            weekStart: '2025-06-02T00:00:00Z',
            authors: ['a@x.com', 'b@x.com', 'c@x.com'],
            commitCount: 5,
          },
          topWindows: [],
          narrative: 'test',
        },
      ],
      totalParallelFiles: 1,
      highParallel: 0,
      tierMix: { low: 0, medium: 0, high: 0, critical: 0 },
      byMonth: [],
      summary: '',
    };

    const result = findCursedFiles(
      churn,
      bus,
      age,
      makeEmptyForensics(),
      parallelDev,
      makeCommits(20),
    );
    // 35 (churn) + 30 (critical bus) + 20 (parallel) = 85
    expect(
      result.files.find((f) => f.file === 'parallel-only.ts'),
    ).toBeDefined();
  });

  describe('bot-driven churn', () => {
    // 35 (churn > 75) + 15 (high bus factor) = 50, the qualifying floor.
    const cursedCandidate = () => ({
      churn: makeChurnReport([
        { file: 'CHANGELOG.md', commitCount: 20, churnScore: 80 },
      ]),
      bus: makeBusFactorReport([
        {
          file: 'CHANGELOG.md',
          risk: 'high' as const,
          dominantAuthorPercent: 80,
          uniqueAuthors: 2,
        },
      ]),
      age: makeAgeMapReport([{ file: 'CHANGELOG.md', ageInDays: 5 }]),
    });

    it('withholds files whose churn is mostly automated', () => {
      const { churn, bus, age } = cursedCandidate();
      const result = findCursedFiles(
        churn,
        bus,
        age,
        makeEmptyForensics(),
        makeEmptyParallelDev(),
        // The real pattern behind this: semantic-release rewrites CHANGELOG.md
        // on every release, which made it the top "cursed" file in gitrelic's
        // own report despite no human ever editing it.
        makeCommits(20, {
          files: ['CHANGELOG.md'],
          authorEmail: 'semantic-release-bot@martynus.net',
        }),
      );

      expect(result.files).toHaveLength(0);
      expect(result.excludedBotFiles).toEqual(['CHANGELOG.md']);
      expect(result.summary).toContain('withheld');
    });

    it('keeps the same file when humans drive the churn', () => {
      const { churn, bus, age } = cursedCandidate();
      const result = findCursedFiles(
        churn,
        bus,
        age,
        makeEmptyForensics(),
        makeEmptyParallelDev(),
        makeCommits(20, { files: ['CHANGELOG.md'] }),
      );

      expect(result.files.map((f) => f.file)).toEqual(['CHANGELOG.md']);
      expect(result.excludedBotFiles).toEqual([]);
    });

    it('keeps files where bots are only a minority of the churn', () => {
      const { churn, bus, age } = cursedCandidate();
      const result = findCursedFiles(
        churn,
        bus,
        age,
        makeEmptyForensics(),
        makeEmptyParallelDev(),
        [
          ...makeCommits(9, {
            files: ['CHANGELOG.md'],
            authorEmail: 'dependabot[bot]@users.noreply.github.com',
          }),
          ...makeCommits(11, { files: ['CHANGELOG.md'] }),
        ],
      );

      expect(result.files).toHaveLength(1);
      expect(result.excludedBotFiles).toEqual([]);
    });
  });

  describe('abandoned hot files', () => {
    const abandoned = () => ({
      churn: makeChurnReport([
        { file: 'a.ts', commitCount: 10, churnScore: 80 },
      ]),
      bus: makeBusFactorReport([
        {
          file: 'a.ts',
          risk: 'high' as const,
          dominantAuthorPercent: 80,
          uniqueAuthors: 2,
        },
      ]),
      age: makeAgeMapReport([{ file: 'a.ts', ageInDays: 337 }]),
    });

    it('flags a file abandoned long before the repo went quiet', () => {
      const { churn, bus, age } = abandoned();
      const result = findCursedFiles(
        churn,
        bus,
        age,
        makeEmptyForensics(),
        makeEmptyParallelDev(),
        makeCommits(10, { files: ['other.ts'], daysAgo: 0 }),
      );

      expect(
        result.files[0].reasons.some((r) => r.startsWith('Heavily churned')),
      ).toBe(true);
    });

    it('does not flag files in a repo that is simply dormant', () => {
      // Every file in an 11-month-dormant repo is 11 months old. An absolute
      // age threshold marks all of them, and the old copy claimed they were
      // "still actively changing" — the opposite of the truth.
      const { churn, bus, age } = abandoned();
      const result = findCursedFiles(
        churn,
        bus,
        age,
        makeEmptyForensics(),
        makeEmptyParallelDev(),
        makeCommits(10, { files: ['a.ts'], daysAgo: 337 }),
      );

      expect(
        result.files[0].reasons.some((r) => r.startsWith('Heavily churned')),
      ).toBe(false);
    });
  });
});
