/**
 * End-to-end snapshot regression test.
 *
 * Builds a deterministic fixture git repo (pinned authors/dates/messages →
 * stable commit hashes) and runs the full `runGitrelic()` pipeline against it.
 * Each analyzer section is snapshotted separately so drift shows up as a
 * focused diff instead of a monolithic blob.
 *
 * When an analyzer's wire format intentionally changes, update the snapshots
 * with `pnpm --filter @gitrelic/core test -- -u`.
 *
 * Goal: catch accidental changes to the `GitrelicReport` shape that would
 * silently break the web dashboard or downstream JSON consumers.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { runGitrelic } from './runner.js';
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
  RepoMeta,
  RewriteRatioReport,
  TestCoverageProxyReport,
} from './types.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const BUILD_SCRIPT = path.resolve(
  __dirname,
  '../tests/fixtures/build-sample-repo.sh',
);

// Pin "now" 26 days after the fixture's last commit (2026-04-05). All
// time-sensitive analyzer logic (contributor.isActive, ghost detection,
// dead-code ageInDays) resolves deterministically from this anchor.
const FROZEN_NOW = new Date('2026-05-01T12:00:00Z');

// ─── Normalization helpers ───────────────────────────────────────────────────

const HASH_RE = /\b[0-9a-f]{40}\b/g;

/** Replaces any 40-char git SHA with a stable placeholder. */
function scrubHashes<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.replace(HASH_RE, '<SHA>') as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => scrubHashes(v)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'hash' && typeof v === 'string') {
        out[k] = '<SHA>';
      } else {
        out[k] = scrubHashes(v);
      }
    }
    return out as T;
  }
  return value;
}

function normalizeMeta(meta: RepoMeta) {
  return {
    ...meta,
    branches: [...meta.branches].sort(),
  };
}

// ─── Fixture lifecycle ───────────────────────────────────────────────────────

let repoPath = '';
let report: GitrelicReport;

beforeAll(async () => {
  // Only fake `Date` — leaving setTimeout/setInterval real keeps execa's
  // subprocess plumbing happy. Analyzer-side `Date.now()` reads the frozen
  // value, while git subprocesses use the pinned commit dates from env vars.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FROZEN_NOW);

  repoPath = mkdtempSync(path.join(tmpdir(), 'gitrelic-fixture-'));
  // execFileSync with argv array — no shell, no injection surface.
  execFileSync('bash', [BUILD_SCRIPT, repoPath], { stdio: 'pipe' });

  report = await runGitrelic({ repoPath });
}, 30_000);

afterAll(() => {
  vi.useRealTimers();
  if (repoPath) {
    rmSync(repoPath, { recursive: true, force: true });
  }
});

// ─── Snapshots ───────────────────────────────────────────────────────────────

describe('fixture regression', () => {
  it('meta shape is stable', () => {
    expect(normalizeMeta(report.meta)).toMatchSnapshot();
  });

  it('churn report is stable', () => {
    expect(scrubHashes<ChurnReport>(report.churn)).toMatchSnapshot();
  });

  it('bus factor report is stable', () => {
    expect(scrubHashes<BusFactorReport>(report.busFactors)).toMatchSnapshot();
  });

  it('age map report is stable', () => {
    expect(scrubHashes<AgeMapReport>(report.ageMap)).toMatchSnapshot();
  });

  it('contributors report is stable', () => {
    expect(
      scrubHashes<ContributorReport>(report.contributors),
    ).toMatchSnapshot();
  });

  it('cursed files list is stable', () => {
    expect(
      scrubHashes<CursedFilesReport>(report.cursedFiles),
    ).toMatchSnapshot();
  });

  it('forensics report is stable', () => {
    expect(scrubHashes<ForensicsReport>(report.forensics)).toMatchSnapshot();
  });

  it('parallel dev report is stable', () => {
    expect(
      scrubHashes<ParallelDevReport>(report.parallelDev),
    ).toMatchSnapshot();
  });

  it('loc report is stable', () => {
    expect(scrubHashes<LocReport>(report.loc)).toMatchSnapshot();
  });

  it('hotspot report is stable', () => {
    expect(scrubHashes<HotspotReport>(report.hotspots)).toMatchSnapshot();
  });

  it('coupling report is stable', () => {
    expect(scrubHashes<CouplingReport>(report.coupling)).toMatchSnapshot();
  });

  it('churn velocity report is stable', () => {
    expect(
      scrubHashes<ChurnVelocityReport>(report.churnVelocity),
    ).toMatchSnapshot();
  });

  it('rewrite ratio report is stable', () => {
    expect(
      scrubHashes<RewriteRatioReport>(report.rewriteRatio),
    ).toMatchSnapshot();
  });

  it('blast radius report is stable', () => {
    expect(
      scrubHashes<BlastRadiusReport>(report.blastRadius),
    ).toMatchSnapshot();
  });

  it('dead code report is stable', () => {
    expect(scrubHashes<DeadCodeReport>(report.deadCode)).toMatchSnapshot();
  });

  it('test coverage report is stable', () => {
    expect(
      scrubHashes<TestCoverageProxyReport>(report.testCoverage),
    ).toMatchSnapshot();
  });

  it('ghost files report is stable', () => {
    expect(scrubHashes<GhostFilesReport>(report.ghostFiles)).toMatchSnapshot();
  });

  it('knowledge concentration report is stable', () => {
    expect(
      scrubHashes<KnowledgeConcentrationReport>(report.knowledgeConcentration),
    ).toMatchSnapshot();
  });

  it('co-authors report is stable', () => {
    expect(scrubHashes<CoAuthorReport>(report.coAuthors)).toMatchSnapshot();
  });

  it('hotspot clusters report is stable', () => {
    expect(
      scrubHashes<HotspotClusterReport>(report.hotspotClusters),
    ).toMatchSnapshot();
  });

  it('complexity trend report is stable', () => {
    expect(
      scrubHashes<ComplexityTrendReport>(report.complexityTrend),
    ).toMatchSnapshot();
  });

  it('commit timing report is stable', () => {
    expect(
      scrubHashes<CommitTimingReport>(report.commitTiming),
    ).toMatchSnapshot();
  });

  it('rename tracking report is stable', () => {
    expect(
      scrubHashes<RenameTrackingReport>(report.renameTracking),
    ).toMatchSnapshot();
  });

  it('top-level report keys are stable', () => {
    // Pins the wire format itself — if a field is added or removed at the top
    // level of GitrelicReport this test flags it immediately.
    expect(Object.keys(report).sort()).toMatchSnapshot();
  });
});
