import { existsSync } from 'node:fs';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { describe, it, expect, beforeAll } from 'vitest';

const cliDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const binary = path.join(cliDir, 'dist', 'index.mjs');
// The repo root — analyzing gitrelic itself gives a report comfortably larger
// than a pipe buffer, which is what makes the truncation assertion meaningful.
const repoRoot = path.resolve(cliDir, '..', '..');

/**
 * The exact size the report used to truncate to. Used only as a size floor — a
 * payload above it cannot have fit in a single pipe buffer on any platform, so
 * nothing here depends on the capacity being the same everywhere (Windows is
 * far smaller).
 */
const TRUNCATION_SIZE = 65_536;

describe('gitrelic --json', () => {
  beforeAll(() => {
    // Fail loudly rather than skipping: a silently-skipped integration test is
    // worse than none, since it reads as coverage that does not exist. CI builds
    // before running tests, so this holds there.
    if (!existsSync(binary)) {
      throw new Error(
        `Built CLI not found at ${binary}. Run \`pnpm build\` before \`pnpm test\`.`,
      );
    }
  });

  it('writes the complete report through a pipe', async () => {
    // execa pipes stdout rather than handing over a TTY, which is the case that
    // was broken: process.exit() discarded Node's queued userspace writes, so
    // output stopped at the pipe capacity while still exiting 0.
    //
    // Shape assertions share this one spawn — each spawn costs a full repo
    // analysis, and they interrogate the same artifact.
    const { stdout, exitCode } = await execa(
      process.execPath,
      [binary, '--json'],
      { cwd: repoRoot },
    );

    expect(exitCode).toBe(0);
    // Guards everything below from passing vacuously: on a repo small enough to
    // fit in one pipe buffer, the old code produced correct output too.
    expect(stdout.length).toBeGreaterThan(TRUNCATION_SIZE);
    expect(() => JSON.parse(stdout)).not.toThrow();

    const report = JSON.parse(stdout);
    // basename of the checkout, not a hard-coded 'gitrelic' — runner.ts derives
    // it that way, so a fork, worktree, or `gh pr checkout` into a differently
    // named directory would otherwise fail here for no real reason.
    expect(report.repoName).toBe(path.basename(repoRoot));
    expect(report.meta.totalCommits).toBeGreaterThan(0);
    expect(report.churn).toBeDefined();
    expect(report.busFactors).toBeDefined();
    // `commits` is serialized last, so asserting it doubles as a completeness
    // check on the tail of the document — the part truncation destroys first.
    expect(Array.isArray(report.commits)).toBe(true);
  });

  it('exits cleanly when the consumer closes the pipe early', async () => {
    // `| head` is ordinary usage. Awaiting the flush made stdout's 'error' event
    // reachable, and with no listener an EPIPE became an uncaught exception.
    const result = await execa(
      `"${process.execPath}" "${binary}" --json | head -c 100`,
      { shell: true, cwd: repoRoot, reject: false },
    );

    expect(result.stderr).not.toContain('EPIPE');
    expect(result.stderr).not.toContain('Unhandled');
  });

  it('keeps stdout parseable when analyzing from a subdirectory', async () => {
    // The "Analyzing repository root:" notice goes to stderr precisely so it
    // cannot corrupt --json. This pins that.
    const { stdout, stderr } = await execa(
      process.execPath,
      [binary, '--json', '--path', path.join(repoRoot, 'apps', 'web', 'src')],
      { cwd: repoRoot },
    );

    expect(stderr).toContain('Analyzing repository root:');
    expect(() => JSON.parse(stdout)).not.toThrow();
    expect(JSON.parse(stdout).repoName).toBe('gitrelic');
  });

  it('exits non-zero with a clean message outside a repository', async () => {
    // Sealed with a ceiling rather than trusting tmpdir to have no repo above
    // it. The ceiling must be the parent — set to the directory itself, git
    // walks straight past it and the assertion passes for the wrong reason.
    const dir = await mkdtemp(path.join(await realpath(tmpdir()), 'gitrelic-'));
    try {
      const result = await execa(process.execPath, [binary, '--json'], {
        cwd: dir,
        env: { GIT_CEILING_DIRECTORIES: path.dirname(dir) },
        reject: false,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('not a git repository');
      expect(result.stdout).toBe('');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
