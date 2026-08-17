import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeAgeMap } from './analyzers/age-map.js';
import { analyzeBlastRadius } from './analyzers/blast-radius.js';
import { analyzeBusFactor } from './analyzers/bus-factor.js';
import { analyzeChurnVelocity } from './analyzers/churn-velocity.js';
import { analyzeChurn } from './analyzers/churn.js';
import { analyzeCoAuthors } from './analyzers/co-author.js';
import { analyzeCommitTiming } from './analyzers/commit-timing.js';
import { analyzeComplexityTrend } from './analyzers/complexity-trend.js';
import { analyzeContributors } from './analyzers/contributors.js';
import { analyzeCoupling } from './analyzers/coupling.js';
import { findCursedFiles } from './analyzers/cursed-files.js';
import { analyzeDeadCode } from './analyzers/dead-code.js';
import { analyzeForensics } from './analyzers/forensics.js';
import { analyzeGhostFiles } from './analyzers/ghost-files.js';
import { analyzeHotspotClustering } from './analyzers/hotspot-clustering.js';
import { analyzeHotspots } from './analyzers/hotspot.js';
import { analyzeKnowledgeConcentration } from './analyzers/knowledge-concentration.js';
import { analyzeLoc } from './analyzers/loc.js';
import { analyzeParallelDev } from './analyzers/parallel-dev.js';
import { analyzeRenameTracking } from './analyzers/rename-tracking.js';
import { analyzeRewriteRatio } from './analyzers/rewrite-ratio.js';
import { analyzeTestCoverage } from './analyzers/test-coverage.js';
import {
  getAllCommits,
  getTrackedFiles,
  getBranches,
  getCurrentBranch,
  detectPrimaryLanguage,
} from './utils/git.js';
import type {
  AgeMapReport,
  BlastRadiusReport,
  BusFactorReport,
  ChurnReport,
  ChurnVelocityReport,
  CoAuthorReport,
  CommitTimingReport,
  ComplexityTrendReport,
  ContributorReport,
  CouplingReport,
  CursedFilesReport,
  DeadCodeReport,
  ForensicsReport,
  GhostFilesReport,
  GitrelicReport,
  HotspotClusterReport,
  HotspotReport,
  KnowledgeConcentrationReport,
  LocReport,
  ParallelDevReport,
  RenameTrackingReport,
  RewriteRatioReport,
  RunGitrelicOptions,
  TestCoverageProxyReport,
} from './types.js';

// Wraps a single analyzer call so that one failure doesn't abort the entire
// run. Logs to stderr with the analyzer name and returns the provided fallback,
// letting downstream analyzers (and the final report) degrade gracefully.
function safeRun<T>(name: string, fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (err) {
    process.stderr.write(
      `[gitrelic] analyzer "${name}" failed: ${(err as Error).message ?? String(err)}\n`,
    );
    return fallback;
  }
}

async function safeRunAsync<T>(
  name: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    process.stderr.write(
      `[gitrelic] analyzer "${name}" failed: ${(err as Error).message ?? String(err)}\n`,
    );
    return fallback;
  }
}

// ─── Fallback shapes for each analyzer ────────────────────────────────────────

const EMPTY_CHURN: ChurnReport = {
  files: [],
  topFiles: [],
  hotspotCount: 0,
  summary: 'unavailable',
};
const EMPTY_BUS_FACTOR: BusFactorReport = {
  files: [],
  criticalFiles: [],
  overallBusFactor: 0,
  summary: 'unavailable',
};
const EMPTY_AGE_MAP: AgeMapReport = {
  files: [],
  staleFiles: [],
  ancientFiles: [],
  medianAgeDays: 0,
  summary: 'unavailable',
};
const EMPTY_CONTRIBUTORS: ContributorReport = {
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
  },
  summary: 'unavailable',
};
const EMPTY_FORENSICS: ForensicsReport = {
  files: [],
  shameLeaderboard: [],
  totalShameCommits: 0,
  summary: 'unavailable',
};
const EMPTY_PARALLEL_DEV: ParallelDevReport = {
  files: [],
  hotFiles: [],
  totalParallelFiles: 0,
  summary: 'unavailable',
};
const EMPTY_LOC: LocReport = {
  totalFiles: 0,
  totalLines: 0,
  files: [],
  languages: [],
  summary: 'unavailable',
};
const EMPTY_HOTSPOTS: HotspotReport = {
  files: [],
  topHotspots: [],
  summary: 'unavailable',
};
const EMPTY_COUPLING: CouplingReport = {
  pairs: [],
  fileProfiles: [],
  topPairs: [],
  summary: 'unavailable',
};
const EMPTY_CHURN_VELOCITY: ChurnVelocityReport = {
  files: [],
  acceleratingFiles: [],
  summary: 'unavailable',
};
const EMPTY_REWRITE_RATIO: RewriteRatioReport = {
  files: [],
  topRewriters: [],
  summary: 'unavailable',
};
const EMPTY_BLAST_RADIUS: BlastRadiusReport = {
  files: [],
  topBlasters: [],
  summary: 'unavailable',
};
const EMPTY_DEAD_CODE: DeadCodeReport = {
  candidates: [],
  totalDeadFiles: 0,
  totalDeadLines: 0,
  summary: 'unavailable',
};
const EMPTY_TEST_COVERAGE: TestCoverageProxyReport = {
  directories: [],
  uncoveredDirectories: [],
  files: [],
  overallRatio: 0,
  summary: 'unavailable',
};
const EMPTY_GHOST_FILES: GhostFilesReport = {
  files: [],
  totalGhostFiles: 0,
  ghostOwners: 0,
  ghostLoc: 0,
  tierMix: { trueGhost: 0, fading: 0 },
  summary: 'unavailable',
};
const EMPTY_KNOWLEDGE: KnowledgeConcentrationReport = {
  singleAuthorFiles: 0,
  totalFiles: 0,
  concentrationIndex: 0,
  summary: 'unavailable',
};
const EMPTY_CO_AUTHORS: CoAuthorReport = {
  pairs: [],
  authorStats: [],
  totalCoAuthoredCommits: 0,
  summary: 'unavailable',
};
const EMPTY_HOTSPOT_CLUSTERS: HotspotClusterReport = {
  clusters: [],
  multiSignalFiles: [],
  summary: 'unavailable',
};
const EMPTY_COMPLEXITY_TREND: ComplexityTrendReport = {
  files: [],
  growingFiles: [],
  shrinkingFiles: [],
  summary: 'unavailable',
};
const EMPTY_COMMIT_TIMING: CommitTimingReport = {
  files: [],
  stressFiles: [],
  repoLateNightPercent: 0,
  repoWeekendPercent: 0,
  summary: 'unavailable',
};
const EMPTY_RENAME_TRACKING: RenameTrackingReport = {
  renames: [],
  chains: [],
  totalRenames: 0,
  filesWithRenames: 0,
  summary: 'unavailable',
};
const EMPTY_CURSED_FILES: CursedFilesReport = {
  files: [],
  excludedBotFiles: [],
  summary: '',
};

/**
 * Runs the GitRelic analysis on a given git repository and returns a comprehensive report.
 * @param options - The options for running the analysis, including repository path, branch, and since date.
 * @Returns a GitrelicReport containing churn, bus factor, age map, contributors, cursed files, and forensics data.
 */
const __coreDir = path.dirname(fileURLToPath(import.meta.url));
const corePkg = JSON.parse(
  readFileSync(path.resolve(__coreDir, '../package.json'), 'utf-8'),
);

export async function runGitrelic(
  options: RunGitrelicOptions,
): Promise<GitrelicReport> {
  const { repoPath, branch, since, onProgress } = options;
  const repoName = path.basename(repoPath);

  onProgress?.('Reading git history...');
  const commits = await getAllCommits(repoPath, { since, branch });

  if (commits.length === 0) {
    const msg = since
      ? `No commits found since "${since}". Try a broader time range or use --since all.`
      : 'No commits found. Is this a git repository?';
    throw new Error(msg);
  }

  onProgress?.('Scanning tracked files...');
  const trackedFiles = await getTrackedFiles(repoPath);
  const branches = await getBranches(repoPath);
  const analyzedBranch = branch ?? (await getCurrentBranch(repoPath));
  const primaryLanguage = detectPrimaryLanguage(trackedFiles);

  const sorted = [...commits].sort((a, b) => a.date.localeCompare(b.date));
  const firstCommit = sorted[0].date;
  const lastCommit = sorted[sorted.length - 1].date;
  // Clamp to at least 1 day so downstream analyzers (age-map thresholds,
  // contributor activity windows) don't collapse to zero on single-commit
  // or same-day repos.
  const ageInDays = Math.max(
    1,
    Math.floor(
      (new Date(lastCommit).getTime() - new Date(firstCommit).getTime()) /
        86_400_000,
    ),
  );
  const uniqueAuthors = new Set(commits.map((c) => c.authorEmail)).size;

  onProgress?.('Analyzing churn...');
  const churn = safeRun(
    'churn',
    () => analyzeChurn(commits, trackedFiles),
    EMPTY_CHURN,
  );

  onProgress?.('Calculating bus factors...');
  const busFactors = safeRun(
    'busFactor',
    () => analyzeBusFactor(commits, trackedFiles),
    EMPTY_BUS_FACTOR,
  );

  onProgress?.('Building age map...');
  const ageMap = safeRun(
    'ageMap',
    () => analyzeAgeMap(commits, trackedFiles, ageInDays),
    EMPTY_AGE_MAP,
  );

  onProgress?.('Profiling contributors...');
  const contributors = safeRun(
    'contributors',
    () => analyzeContributors(commits, ageInDays),
    EMPTY_CONTRIBUTORS,
  );

  // Backfill filesOwned from bus factor data
  for (const contributor of contributors.contributors) {
    contributor.filesOwned = busFactors.files.filter(
      (f) => f.dominantAuthor === contributor.email,
    ).length;
  }

  onProgress?.('Analyzing commit message forensics...');
  const forensics = safeRun(
    'forensics',
    () => analyzeForensics(commits, trackedFiles),
    EMPTY_FORENSICS,
  );

  onProgress?.('Detecting parallel development...');
  const parallelDev = safeRun(
    'parallelDev',
    () => analyzeParallelDev(commits, trackedFiles),
    EMPTY_PARALLEL_DEV,
  );

  onProgress?.('Counting lines of code...');
  const loc = await safeRunAsync(
    'loc',
    () => analyzeLoc(trackedFiles, repoPath),
    EMPTY_LOC,
  );

  onProgress?.('Computing hotspot scores...');
  const hotspots = safeRun(
    'hotspots',
    () => analyzeHotspots(churn, loc),
    EMPTY_HOTSPOTS,
  );

  onProgress?.('Mapping file coupling...');
  const coupling = safeRun(
    'coupling',
    () => analyzeCoupling(commits, trackedFiles),
    EMPTY_COUPLING,
  );

  onProgress?.('Analyzing churn velocity...');
  const churnVelocity = safeRun(
    'churnVelocity',
    () => analyzeChurnVelocity(commits, trackedFiles),
    EMPTY_CHURN_VELOCITY,
  );

  onProgress?.('Calculating rewrite ratios...');
  const rewriteRatio = safeRun(
    'rewriteRatio',
    () => analyzeRewriteRatio(commits, trackedFiles),
    EMPTY_REWRITE_RATIO,
  );

  onProgress?.('Measuring blast radius...');
  const blastRadius = safeRun(
    'blastRadius',
    () => analyzeBlastRadius(commits, trackedFiles),
    EMPTY_BLAST_RADIUS,
  );

  onProgress?.('Finding dead code candidates...');
  const deadCode = safeRun(
    'deadCode',
    () => analyzeDeadCode(commits, trackedFiles, ageMap, loc),
    EMPTY_DEAD_CODE,
  );

  onProgress?.('Checking test coverage...');
  const testCoverage = safeRun(
    'testCoverage',
    () => analyzeTestCoverage(trackedFiles),
    EMPTY_TEST_COVERAGE,
  );

  onProgress?.('Detecting ghost files...');
  const ghostFiles = safeRun(
    'ghostFiles',
    () => analyzeGhostFiles(busFactors, contributors, loc),
    EMPTY_GHOST_FILES,
  );

  onProgress?.('Measuring knowledge concentration...');
  const knowledgeConcentration = safeRun(
    'knowledgeConcentration',
    () => analyzeKnowledgeConcentration(busFactors),
    EMPTY_KNOWLEDGE,
  );

  onProgress?.('Analyzing co-authorship...');
  const coAuthors = safeRun(
    'coAuthors',
    () => analyzeCoAuthors(commits),
    EMPTY_CO_AUTHORS,
  );

  onProgress?.('Clustering hotspots...');
  const hotspotClusters = safeRun(
    'hotspotClusters',
    () =>
      analyzeHotspotClustering(
        hotspots,
        busFactors,
        coupling,
        contributors,
        commits,
        trackedFiles,
      ),
    EMPTY_HOTSPOT_CLUSTERS,
  );

  onProgress?.('Tracking complexity trends...');
  const complexityTrend = safeRun(
    'complexityTrend',
    () => analyzeComplexityTrend(commits, trackedFiles),
    EMPTY_COMPLEXITY_TREND,
  );

  onProgress?.('Analyzing commit timing...');
  const commitTiming = safeRun(
    'commitTiming',
    () => analyzeCommitTiming(commits, trackedFiles),
    EMPTY_COMMIT_TIMING,
  );

  onProgress?.('Tracking file renames...');
  const renameTracking = await safeRunAsync(
    'renameTracking',
    () => analyzeRenameTracking(repoPath, trackedFiles, { since }),
    EMPTY_RENAME_TRACKING,
  );

  onProgress?.('Finding cursed files...');
  const cursedFiles = safeRun(
    'cursedFiles',
    () =>
      findCursedFiles(
        churn,
        busFactors,
        ageMap,
        forensics,
        parallelDev,
        commits,
      ),
    EMPTY_CURSED_FILES,
  );

  return {
    timestamp: new Date().toISOString(),
    repoPath,
    repoName,
    meta: {
      totalCommits: commits.length,
      totalFiles: trackedFiles.length,
      totalAuthors: uniqueAuthors,
      firstCommit,
      lastCommit,
      ageInDays,
      primaryLanguage,
      branches,
      analyzedBranch,
      gitrelicVersion: corePkg.version,
    },
    churn,
    busFactors,
    ageMap,
    contributors,
    cursedFiles,
    forensics,
    parallelDev,
    loc,
    hotspots,
    coupling,
    churnVelocity,
    rewriteRatio,
    blastRadius,
    deadCode,
    testCoverage,
    ghostFiles,
    knowledgeConcentration,
    coAuthors,
    hotspotClusters,
    complexityTrend,
    commitTiming,
    renameTracking,
    commits,
  };
}
