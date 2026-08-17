// ─── Core report shape ────────────────────────────────────────────────────────

import type { RawCommit } from './utils/git.js';

export interface GitrelicReport {
  timestamp: string;
  repoPath: string;
  repoName: string;
  meta: RepoMeta;
  churn: ChurnReport;
  busFactors: BusFactorReport;
  ageMap: AgeMapReport;
  contributors: ContributorReport;
  cursedFiles: CursedFilesReport;
  forensics: ForensicsReport;
  parallelDev: ParallelDevReport;
  loc: LocReport;
  hotspots: HotspotReport;
  coupling: CouplingReport;
  churnVelocity: ChurnVelocityReport;
  rewriteRatio: RewriteRatioReport;
  blastRadius: BlastRadiusReport;
  deadCode: DeadCodeReport;
  testCoverage: TestCoverageProxyReport;
  ghostFiles: GhostFilesReport;
  knowledgeConcentration: KnowledgeConcentrationReport;
  coAuthors: CoAuthorReport;
  hotspotClusters: HotspotClusterReport;
  complexityTrend: ComplexityTrendReport;
  commitTiming: CommitTimingReport;
  renameTracking: RenameTrackingReport;
  commits: RawCommit[];
}

// ─── Repo metadata ─────────────────────────────────────────────────────────────

export interface RepoMeta {
  totalCommits: number;
  totalFiles: number;
  totalAuthors: number;
  firstCommit: string; // ISO date
  lastCommit: string; // ISO date
  ageInDays: number;
  primaryLanguage: string;
  branches: string[];
  analyzedBranch: string;
  gitrelicVersion: string;
}

// ─── Churn ─────────────────────────────────────────────────────────────────────

export interface FileChurn {
  file: string;
  commitCount: number; // how many commits touched this file
  churnScore: number; // 0–100 relative to repo max
  category: ChurnCategory;
}

export type ChurnCategory = 'hot' | 'warm' | 'cold' | 'frozen';

export interface ChurnReport {
  files: FileChurn[];
  topFiles: FileChurn[]; // top 20 by commit count
  hotspotCount: number; // files with churnScore > 75
  summary: string; // e.g. "auth.ts has been modified in 34% of all commits"
}

// ─── Bus factor ────────────────────────────────────────────────────────────────

export interface FileBusFactor {
  file: string;
  uniqueAuthors: number;
  authors: string[]; // email list
  dominantAuthor: string; // author with most commits to this file
  dominantAuthorPercent: number;
  risk: BusFactorRisk;
}

export type BusFactorRisk = 'critical' | 'high' | 'medium' | 'low';

export interface BusFactorReport {
  files: FileBusFactor[];
  criticalFiles: FileBusFactor[]; // single author owns >80% of commits
  overallBusFactor: number; // min unique authors across top files
  summary: string;
}

// ─── Age map ───────────────────────────────────────────────────────────────────

export interface FileAge {
  file: string;
  lastCommitDate: string; // ISO date
  ageInDays: number;
  status: AgeStatus;
}

export type AgeStatus = 'fresh' | 'aging' | 'stale' | 'ancient';

export interface AgeMapReport {
  files: FileAge[];
  staleFiles: FileAge[];
  ancientFiles: FileAge[];
  medianAgeDays: number;
  thresholds: {
    /** Files at or below `freshLimit` days are tier "fresh". */
    freshLimit: number;
    /** Files at or below `agingLimit` (and above `freshLimit`) are tier "aging". */
    agingLimit: number;
    /** Files at or below `staleLimit` (and above `agingLimit`) are tier "stale". Files above this are "ancient". */
    staleLimit: number;
  };
  summary: string;
}

// ─── Contributors ──────────────────────────────────────────────────────────────

export interface Contributor {
  email: string;
  name: string;
  commitCount: number;
  firstCommit: string;
  lastCommit: string;
  filesOwned: number; // files where they are dominant author
  linesChanged: number;
  activeDays: number;
  focusAreas: string[]; // top directories they work in
  isActive: boolean; // last commit within the active window (≥ max(90, repoAge * 0.25) days)
  isGhost: boolean; // last commit predates the ghost cutoff (max(180, repoAge * 0.5) days). Mutually exclusive with isActive; both false = intermediate zone.
}

export interface ContributorReport {
  contributors: Contributor[];
  activeContributors: Contributor[];
  ghostContributors: Contributor[]; // committed but no activity in >6 months
  topContributor: Contributor;
  summary: string;
  top3CommitShare: number; // % (0-100), top-3 commit-count concentration
  newcomers90d: number; // count of contributors whose firstCommit is ≤ 90d ago
}

// ─── Cursed files ──────────────────────────────────────────────────────────────

export interface CursedFile {
  file: string;
  curseScore: number; // 0–100
  reasons: string[]; // human-readable explanations
  churn: number;
  authors: number;
  ageDays: number;
  narrative: string; // e.g. "This file has been touched by 7 authors in 89 commits — it's either the heart of the codebase or a ticking time bomb."
}

export interface CursedFilesReport {
  files: CursedFile[];
  // Files that scored as cursed but whose churn is overwhelmingly automated
  // (semantic-release, dependabot, …). Surfaced rather than silently dropped so
  // an empty panel is explainable instead of just looking broken.
  excludedBotFiles: string[];
  summary: string;
}

// ─── Forensics (commit message shame scoring) ──────────────────────────────────

export interface ShamefulCommit {
  hash: string;
  message: string;
  date: string;
  shamePoints: number; // weighted score from this commit's keywords
  keywords: string[]; // which keywords fired
}

export interface FileForensics {
  file: string;
  shameScore: number; // 0–100 normalized ratio
  rawShamePoints: number; // absolute weighted sum across all commits
  shameCommitCount: number; // how many commits had shame keywords
  topShameCommits: ShamefulCommit[]; // top 3 by shamePoints
  dominantKeywords: string[]; // most frequent shame keywords for this file
}

export interface ShameByMonth {
  month: string; // ISO YYYY-MM (e.g. "2026-04")
  critical: number;
  moderate: number;
  mild: number;
}

export interface ForensicsReport {
  files: FileForensics[];
  shameLeaderboard: FileForensics[]; // top 10 most shameful files
  totalShameCommits: number;
  keywordTiers: { critical: number; moderate: number; mild: number };
  byMonth: ShameByMonth[];
  summary: string;
}

// ─── Parallel development ─────────────────────────────────────────────────────

export interface ParallelWindow {
  weekStart: string; // ISO date of the Monday starting this week
  authors: string[]; // distinct authors who committed that week
  commitCount: number; // total commits from all authors that week
}

export interface FileParallelDev {
  file: string;
  parallelScore: number; // 0–100
  totalActiveWeeks: number; // weeks where any commit happened
  parallelWeeks: number; // weeks where 2+ distinct authors committed
  peakAuthors: number; // max distinct authors in a single week
  peakWindow: ParallelWindow; // the week with the most author overlap
  topWindows: ParallelWindow[]; // top 3 parallel windows by author count
  narrative: string; // human-readable summary
}

export interface ParallelByMonth {
  month: string; // ISO YYYY-MM (e.g. "2026-04")
  parallelEvents: number; // distinct (file, week) parallel-development events that started in this month
  uniqueFiles: number; // distinct files with at least one parallel event in this month
  avgAuthors: number; // average author count across parallel events in this month
}

export interface ParallelDevReport {
  files: FileParallelDev[];
  hotFiles: FileParallelDev[]; // top 10 by parallelScore
  totalParallelFiles: number; // files with any parallel activity
  highParallel: number; // files at or above the 70 polish-pattern threshold (spans high tier 70–74 + critical tier 75+)
  tierMix: { low: number; medium: number; high: number; critical: number }; // 0-24 / 25-49 / 50-74 / 75-100
  byMonth: ParallelByMonth[]; // repo-aggregate monthly parallel activity
  summary: string;
}

// ─── Lines of code ───────────────────────────────────────────────────────────

export interface FileLocEntry {
  file: string;
  lines: number;
  language: string;
}

export interface LanguageBreakdown {
  language: string;
  files: number;
  lines: number;
  percentage: number;
}

export interface LocReport {
  totalFiles: number;
  totalLines: number;
  files: FileLocEntry[];
  languages: LanguageBreakdown[];
  summary: string;
}

// ─── Hotspot score ───────────────────────────────────────────────────────────

export interface HotspotEntry {
  file: string;
  hotspotScore: number;
  churnScore: number;
  loc: number;
  category: HotspotCategory;
}

export type HotspotCategory = 'critical' | 'warning' | 'moderate' | 'low';

export interface HotspotReport {
  files: HotspotEntry[];
  topHotspots: HotspotEntry[];
  summary: string;
}

// ─── Coupling map ────────────────────────────────────────────────────────────

export interface CoupledPair {
  fileA: string;
  fileB: string;
  coCommits: number;
  totalCommitsA: number;
  totalCommitsB: number;
  couplingStrength: number;
}

export interface FileCouplingProfile {
  file: string;
  partners: CoupledPair[];
  topPartner: string | null;
  couplingScore: number;
}

export interface CouplingReport {
  pairs: CoupledPair[];
  fileProfiles: FileCouplingProfile[];
  topPairs: CoupledPair[];
  summary: string;
}

// ─── Churn velocity ──────────────────────────────────────────────────────────

export interface FileChurnVelocity {
  file: string;
  velocityScore: number;
  trend: ChurnTrend;
  recentCommits: number;
  olderCommits: number;
  totalCommits: number;
}

export type ChurnTrend = 'accelerating' | 'decelerating' | 'stable';

export interface ChurnVelocityReport {
  files: FileChurnVelocity[];
  acceleratingFiles: FileChurnVelocity[];
  summary: string;
}

// ─── Rewrite ratio ──────────────────────────────────────────────────────────

export interface FileRewriteRatio {
  file: string;
  rewriteScore: number;
  totalInsertions: number;
  totalDeletions: number;
  ratio: number;
}

export interface RewriteRatioReport {
  files: FileRewriteRatio[];
  topRewriters: FileRewriteRatio[];
  totalInsertions: number;
  totalDeletions: number;
  highRewrite: number;
  summary: string;
}

// ─── Blast radius ───────────────────────────────────────────────────────────

export interface FileBlastRadius {
  file: string;
  blastScore: number;
  avgCoChangedFiles: number;
  maxCoChangedFiles: number;
  totalCommits: number;
}

export interface BlastRadiusReport {
  files: FileBlastRadius[];
  topBlasters: FileBlastRadius[];
  summary: string;
}

// ─── Dead code candidates ───────────────────────────────────────────────────

export interface DeadCodeCandidate {
  file: string;
  lastCommitDate: string;
  ageInDays: number;
  language: string;
  loc: number;
}

export interface DeadCodeReport {
  candidates: DeadCodeCandidate[];
  totalDeadFiles: number;
  totalDeadLines: number;
  summary: string;
}

// ─── Test coverage proxy ────────────────────────────────────────────────────

export interface DirectoryCoverage {
  directory: string;
  sourceFiles: number;
  testFiles: number;
  coverageRatio: number; // testFiles / sourceFiles, 0-1
  hasTests: boolean;
}

export interface TestCoverageFile {
  file: string;
  hasTestSibling: boolean;
}

export interface TestCoverageProxyReport {
  directories: DirectoryCoverage[];
  uncoveredDirectories: DirectoryCoverage[]; // directories with 0 test files
  files: TestCoverageFile[];
  overallRatio: number; // repo-wide test/source ratio
  summary: string;
}

// ─── Ghost files ────────────────────────────────────────────────────────────

export interface GhostFile {
  file: string;
  dominantAuthor: string;
  dominantAuthorPercent: number;
  lastAuthorCommitDate: string; // ISO date of dominant author's last commit anywhere
  authorInactiveDays: number;
  loc: number;
}

export interface GhostFilesReport {
  files: GhostFile[];
  totalGhostFiles: number;
  ghostOwners: number; // distinct dominant-author count
  ghostLoc: number; // total LOC across ghost files
  tierMix: {
    trueGhost: number; // authorInactiveDays >= 365
    fading: number; // 180 <= authorInactiveDays < 365
  };
  summary: string;
}

// ─── Knowledge concentration ────────────────────────────────────────────────

export interface KnowledgeConcentrationReport {
  singleAuthorFiles: number; // files where one author has >80% of commits
  totalFiles: number;
  concentrationIndex: number; // singleAuthorFiles / totalFiles × 100
  summary: string;
}

// ─── Co-author analysis ─────────────────────────────────────────────────────

export type AdoptionTier = 'none' | 'low' | 'moderate' | 'high';

// Bots are filtered out of pairs[] before they reach consumers, so a
// 'bot-involved' classification is structurally impossible here.
export type CoAuthorPairClassification = 'human-pair' | 'human-ai';

export interface CoAuthorPair {
  authorA: string;
  authorB: string;
  coAuthoredCommits: number;
  files: string[];
  classification: CoAuthorPairClassification;
}

export interface CoAuthorStats {
  author: string;
  coAuthoredCommits: number; // commits where this author was a co-author
  primaryPartner: string | null;
}

export interface AiAuthorStat {
  author: string; // email (lowercased)
  displayName: string;
  aiCommits: number; // commits authored by this human with AI co-author
  totalCommits: number; // all commits authored by this human in window
  personalRatio: number; // 0–100, aiCommits / totalCommits
}

export interface PerAuthorMixEntry {
  author: string;
  displayName: string;
  aiCommits: number;
  soloCommits: number;
  totalCommits: number;
  personalRatio: number; // 0–100
}

export interface CoAuthorMonthEntry {
  month: string; // ISO `YYYY-MM`
  aiAssisted: number;
  pureHuman: number;
  total: number;
}

export interface CoAuthorReport {
  // Strict invariant: pairs[] never contains a bot endpoint (filtered at the
  // analyzer). humanPairs is a strict subset where classification is
  // 'human-pair' (no AI either) — maintained by the analyzer, not derived at
  // consumer time, so tabs don't have to re-filter on every render.
  pairs: CoAuthorPair[];
  humanPairs: CoAuthorPair[];

  authorStats: CoAuthorStats[];
  totalCoAuthoredCommits: number;
  summary: string;

  aiAssistedCommits: number;
  humanAuthoredCommits: number; // denominator for B%
  aiAdoptionPercent: number; // 0–100 (B-formula)
  aiAdoptionTier: AdoptionTier;
  aiAuthors: AiAuthorStat[]; // humans with personalRatio > 0, sorted desc by aiCommits
  filteredBotCommits: number; // for the panel footnote
  byMonth: CoAuthorMonthEntry[];
  perAuthorMix: PerAuthorMixEntry[];
}

// ─── Hotspot clustering ────────────────────────────────────────────────────

export type ClusterDimension =
  | 'structural'
  | 'ownership'
  | 'temporal'
  | 'coupling-hub';

export interface ClusterMember {
  file: string;
  hotspotScore: number;
}

export interface HotspotCluster {
  dimension: ClusterDimension;
  label: string;
  members: ClusterMember[];
  clusterScore: number;
  narrative: string;
  sharedTrait: string;
}

export interface HotspotClusterReport {
  clusters: HotspotCluster[];
  multiSignalFiles: MultiSignalFile[];
  summary: string;
}

export interface MultiSignalFile {
  file: string;
  clusterCount: number;
  dimensions: ClusterDimension[];
}

// ─── Complexity trend ─────────────────────────────────────────────────

export interface FileGrowthBucket {
  month: string; // "2025-06"
  netLines: number; // insertions - deletions that month
  cumulative: number; // running total of net lines within the analysis window (not absolute file size)
}

export interface FileComplexityTrend {
  file: string;
  buckets: FileGrowthBucket[];
  totalNetLines: number; // sum of all net lines across all buckets
  recentGrowthRate: number; // avg net lines/month over last 3 active months
  trend: GrowthTrend;
}

export type GrowthTrend = 'growing' | 'shrinking' | 'stable';

export interface ComplexityTrendReport {
  files: FileComplexityTrend[];
  growingFiles: FileComplexityTrend[]; // top 10 growers by recentGrowthRate
  shrinkingFiles: FileComplexityTrend[]; // top 10 shrinkers
  summary: string;
}

// ─── Commit timing forensics ─────────────────────────────────────────

export type TimeOfDay =
  | 'early-morning'
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'night';
export type DayType = 'weekday' | 'weekend';

export interface FileTimingProfile {
  file: string;
  totalCommits: number;
  lateNightPercent: number; // commits between 11pm–5am as percentage
  weekendPercent: number; // Saturday + Sunday commits as percentage
  peakHour: number; // 0-23, hour with most commits
  peakDay: number; // 0-6 (Sun=0), day with most commits
  hourDistribution: number[]; // 24 entries, commit count per hour
  stressScore: number; // 0–100, weighted from late-night + weekend frequency
}

export interface AuthorStressProfile {
  email: string; // stable id, lowercased
  name: string; // display, full git author name (with collision suffix if needed)
  totalCommits: number;
  lateNightCommits: number;
  weekendCommits: number;
  lateNightPercent: number; // 0–100, rounded
  weekendPercent: number; // 0–100, rounded
  stressScore: number; // round(lateNightPercent × 0.6 + weekendPercent × 0.4), 0–100
}

export interface CommitTimingMonthlyBucket {
  month: string; // ISO YYYY-MM (local time)
  weekendLateNight: number; // commits matching BOTH criteria
  singleCriterion: number; // commits matching exactly one criterion (XOR)
  healthy: number; // commits matching neither
  total: number; // sum of the three above
}

export interface CommitTimingTierMix {
  low: number; // stressScore 0–24
  medium: number; // 25–49
  high: number; // 50–74
  critical: number; // 75+
}

export interface CommitTimingReport {
  files: FileTimingProfile[];
  stressFiles: FileTimingProfile[]; // top 10 by stressScore
  repoLateNightPercent: number; // repo-wide late night commit percentage
  repoWeekendPercent: number; // repo-wide weekend commit percentage
  summary: string;
  repoHourDayMatrix: number[][]; // 7 rows × 24 cols, [dayOfWeek][hour]; Sun=0
  highStress: number; // count of files with stressScore ≥ 70
  tierMix: CommitTimingTierMix; // file-score band counts
  byMonth: CommitTimingMonthlyBucket[]; // disjoint, sorted ascending by month
  authorStress: AuthorStressProfile[]; // sorted desc by stressScore, post-floor and post-disambiguation
}

// ─── Rename tracking ─────────────────────────────────────────────────────────

export interface FileRename {
  oldPath: string;
  newPath: string;
  commitHash: string;
  date: string; // ISO date of the rename commit
}

export interface FileRenameChain {
  currentPath: string;
  previousNames: string[]; // ordered oldest → newest (not including currentPath)
  renameCount: number;
}

export interface RenameTrackingReport {
  renames: FileRename[];
  chains: FileRenameChain[]; // files with rename history
  totalRenames: number;
  filesWithRenames: number; // how many current files have been renamed at least once
  summary: string;
}

// ─── Runner options ────────────────────────────────────────────────────────────

export interface RunGitrelicOptions {
  repoPath: string;
  branch?: string;
  since?: string; // e.g. "6 months ago", "2023-01-01"
  maxFiles?: number; // limit analysis to top N churned files
  onProgress?: (step: string) => void;
}
