import { isBotEmail } from '../utils/authorClassification.js';
import type {
  ChurnReport,
  BusFactorReport,
  AgeMapReport,
  ForensicsReport,
  ParallelDevReport,
} from '../types.js';
import type { CursedFile, CursedFilesReport } from '../types.js';
import type { RawCommit } from '../utils/git.js';

/**
 * Share of a file's commits that must come from bot accounts before it is
 * treated as machine-generated churn rather than a human signal. A simple
 * majority: below this a real person is still driving most of the changes.
 */
const BOT_CHURN_THRESHOLD = 0.5;

/**
 * How long a file must have gone quiet *before the repository itself did* to
 * count as abandoned. Measured relative to the repo's last commit rather than
 * to today, so a dormant repo doesn't mark every file it contains.
 */
const ABANDONED_AFTER_DAYS = 180;

const MS_PER_DAY = 86_400_000;

/**
 * Fraction of each file's commits authored by bots, keyed by file path.
 * Files with no commits in the window are absent rather than zero.
 */
/**
 * Deliberately keys on `isBotEmail` only. AI-authored commits classify as `ai`,
 * not `bot`, and count as human churn here — a person prompted them and owns
 * the result, so the ownership signal still holds. Only unattended automation
 * (release bots, dependency bots) is machine churn for this purpose.
 */
function botChurnShareByFile(commits: RawCommit[]): Map<string, number> {
  const tally = new Map<string, { bot: number; total: number }>();

  for (const commit of commits) {
    const bot = isBotEmail(commit.authorEmail);
    for (const file of commit.files) {
      const entry = tally.get(file) ?? { bot: 0, total: 0 };
      entry.total += 1;
      if (bot) entry.bot += 1;
      tally.set(file, entry);
    }
  }

  const shares = new Map<string, number>();
  for (const [file, { bot, total }] of tally) {
    if (total > 0) shares.set(file, bot / total);
  }
  return shares;
}

/** Days between the repository's most recent commit and now. */
function repoIdleDays(commits: RawCommit[]): number {
  let newest = 0;
  for (const commit of commits) {
    const ms = Date.parse(commit.date);
    if (!Number.isNaN(ms) && ms > newest) newest = ms;
  }
  // No parseable dates: report zero idle days, which degrades the abandonment
  // check back to the absolute `ageInDays > ABANDONED_AFTER_DAYS` behaviour
  // rather than suppressing it. Unreachable with real git output.
  if (newest === 0) return 0;
  return Math.max(0, (Date.now() - newest) / MS_PER_DAY);
}

/**
 * Analyzes the repository to identify "cursed" files that exhibit high churn, low bus factor, and/or age paradox characteristics.
 * @param churn - The churn report for the repository.
 * @param busFactor - The bus factor report for the repository.
 * @param ageMap - The age map report for the repository.
 * @param forensics - The forensics report for the repository.
 * @param parallelDev - The parallel development report for the repository.
 * @param commits - Every commit in the analyzed window. Needed to attribute
 *   churn to humans vs bots and to date the repository's own last activity.
 * @returns Cursed files, plus the ones withheld as machine-generated churn.
 */
export function findCursedFiles(
  churn: ChurnReport,
  busFactor: BusFactorReport,
  ageMap: AgeMapReport,
  forensics: ForensicsReport,
  parallelDev: ParallelDevReport,
  commits: RawCommit[],
): CursedFilesReport {
  const totalCommits = commits.length;
  const botShare = botChurnShareByFile(commits);
  const idleDays = repoIdleDays(commits);
  const excludedBotFiles: string[] = [];
  // Index the other reports by file for O(1) lookups
  const churnByFile = new Map(churn.files.map((f) => [f.file, f]));
  const busFactorByFile = new Map(busFactor.files.map((f) => [f.file, f]));
  const ageByFile = new Map(ageMap.files.map((f) => [f.file, f]));
  const forensicsByFile = new Map(forensics.files.map((f) => [f.file, f]));
  const parallelByFile = new Map(parallelDev.files.map((f) => [f.file, f]));

  const candidates = new Set([
    ...churn.topFiles.map((f) => f.file),
    ...busFactor.criticalFiles.map((f) => f.file),
    ...forensics.shameLeaderboard.map((f) => f.file),
    ...parallelDev.hotFiles.map((f) => f.file),
  ]);

  const cursed: CursedFile[] = [];

  for (const file of candidates) {
    const c = churnByFile.get(file);
    const b = busFactorByFile.get(file);
    const a = ageByFile.get(file);
    const f = forensicsByFile.get(file);

    // Churn data is required to produce a CursedFile (needed for score, narrative, and churn field).
    // Shame-only files (no churn data) are evaluated but dropped here intentionally.
    if (!c) continue;

    const reasons: string[] = [];
    let curseScore = 0;

    // High churn
    if (c.churnScore > 75) {
      reasons.push(
        `Modified in ${Math.round((c.commitCount / totalCommits) * 100)}% of all commits`,
      );
      curseScore += 35;
    } else if (c.churnScore > 40) {
      reasons.push(`Frequently modified (${c.commitCount} commits)`);
      curseScore += 15;
    }

    // Bus factor risk
    if (b) {
      if (b.risk === 'critical') {
        reasons.push(
          `Single author owns ${b.dominantAuthorPercent}% of changes`,
        );
        curseScore += 30;
      } else if (b.risk === 'high') {
        reasons.push(
          `Heavily concentrated ownership (${b.dominantAuthorPercent}% one author)`,
        );
        curseScore += 15;
      } else if (b.uniqueAuthors > 5) {
        reasons.push(
          `${b.uniqueAuthors} different authors — high coordination overhead`,
        );
        curseScore += 10;
      }
    }

    // Abandoned hot file: heavily churned, then left untouched. Measured
    // against the repo's own last commit, not today — in a dormant repo every
    // file is old, and an absolute threshold would flag all of them.
    if (
      a &&
      a.ageInDays - idleDays > ABANDONED_AFTER_DAYS &&
      c.churnScore > 60
    ) {
      reasons.push(
        `Heavily churned, then untouched for ${Math.round(a.ageInDays)} days`,
      );
      curseScore += 10;
    }

    // Shame bonus
    if (f) {
      const topKw = f.dominantKeywords[0];
      if (f.shameScore >= 75) {
        reasons.push(
          `${f.shameCommitCount} shame commits detected${topKw ? ` ("${topKw}" appears repeatedly)` : ''} — this file keeps breaking`,
        );
        curseScore += 20;
      } else if (f.shameScore >= 50) {
        reasons.push(
          `High rate of fix/revert commits (shame score: ${f.shameScore}/100)`,
        );
        curseScore += 12;
      } else if (f.shameScore >= 25) {
        reasons.push('Notable pattern of shame commits');
        curseScore += 6;
      }
    }

    // Parallel development risk
    const pd = parallelByFile.get(file);
    if (pd) {
      if (pd.parallelScore >= 70) {
        reasons.push(
          `Heavy parallel development — ${pd.parallelWeeks} weeks of concurrent multi-author work`,
        );
        curseScore += 20;
      } else if (pd.parallelScore >= 40) {
        reasons.push('Notable parallel development activity');
        curseScore += 10;
      } else if (pd.parallelScore >= 20) {
        reasons.push('Some parallel development detected');
        curseScore += 5;
      }
    }

    if (curseScore < 50 || reasons.length === 0) continue;

    // Withheld only after scoring, so the exclusion list names files that would
    // otherwise have topped the panel — the ones worth explaining away.
    if ((botShare.get(file) ?? 0) > BOT_CHURN_THRESHOLD) {
      excludedBotFiles.push(file);
      continue;
    }

    const narrative = buildNarrative(
      file,
      c.commitCount,
      b?.uniqueAuthors ?? 1,
      c.churnScore,
      totalCommits,
    );

    cursed.push({
      file,
      curseScore: Math.min(curseScore, 100),
      reasons,
      churn: c.commitCount,
      authors: b?.uniqueAuthors ?? 1,
      ageDays: a?.ageInDays ?? 0,
      narrative,
    });
  }

  const files = cursed.sort((a, b) => b.curseScore - a.curseScore);
  excludedBotFiles.sort();

  return {
    files,
    excludedBotFiles,
    summary: buildSummary(files, excludedBotFiles),
  };
}

function buildSummary(files: CursedFile[], excludedBotFiles: string[]): string {
  const excluded =
    excludedBotFiles.length > 0
      ? ` ${excludedBotFiles.length} file${excludedBotFiles.length === 1 ? '' : 's'} withheld as machine-generated churn.`
      : '';

  if (files.length === 0) {
    return `No cursed files found.${excluded}`;
  }

  const worst = files[0];
  return `${files.length} cursed file${files.length === 1 ? '' : 's'}. Worst is ${worst.file} at ${worst.curseScore}/100.${excluded}`;
}

function buildNarrative(
  file: string,
  commits: number,
  authors: number,
  churnScore: number,
  totalCommits: number,
): string {
  const pct = Math.round((commits / totalCommits) * 100);

  if (authors === 1 && churnScore > 75) {
    return `${file} has been touched in ${pct}% of all commits by a single author. That person is a single point of failure.`;
  }
  if (authors > 5 && churnScore > 60) {
    return `${file} has been touched by ${authors} authors in ${commits} commits — it's either the heart of the codebase or a coordination nightmare.`;
  }
  if (churnScore > 75) {
    return `${file} appears in ${pct}% of commits. High churn here often signals unclear ownership or accumulated tech debt.`;
  }
  return `${file} has seen ${commits} commits from ${authors} author${authors === 1 ? '' : 's'} — worth keeping an eye on.`;
}
