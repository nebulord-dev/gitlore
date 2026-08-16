import { execa } from 'execa';

// ─── Raw git primitives ────────────────────────────────────────────────────────

export interface FileStats {
  file: string;
  insertions: number;
  deletions: number;
}

export interface CoAuthor {
  name: string;
  email: string;
}

export interface RawCommit {
  hash: string;
  authorEmail: string;
  authorName: string;
  date: string; // ISO
  message: string;
  coAuthors: CoAuthor[];
  files: string[];
  fileStats: FileStats[];
  insertions: number;
  deletions: number;
}

/**
 * Fetches all commits with their changed files using git log.
 * Format: COMMIT|hash|email|name|date, then MSG|subject, then
 * TRAILERS|<co-author values separated by 0x1F>, then numstat lines.
 * Co-author trailers live in commit bodies (not subjects), so we rely on
 * git's native trailer parser via %(trailers:...) instead of regexing %B.
 * @see https://git-scm.com/docs/git-log
 * @param repoPath - The path to the git repository.
 * @param options - Optional parameters for filtering commits.
 * @returns An array of RawCommit objects representing the commits in the repository.
 */
export async function getAllCommits(
  repoPath: string,
  options: { since?: string; branch?: string } = {},
): Promise<RawCommit[]> {
  const args = [
    'log',
    '--format=COMMIT|%H|%ae|%an|%aI%nMSG|%s%nTRAILERS|%(trailers:key=Co-authored-by,valueonly,separator=%x1F)',
    '--numstat',
    '--no-merges',
  ];

  if (options.since) args.push(`--since=${options.since}`);
  if (options.branch) args.push(options.branch);

  const { stdout } = await execa('git', args, { cwd: repoPath });
  return parseGitLog(stdout);
}

const CO_AUTHOR_VALUE_REGEX = /^(.*?)\s*<([^>]+)>\s*$/;

function parseCoAuthorValues(raw: string): CoAuthor[] {
  if (!raw) return [];
  const out: CoAuthor[] = [];
  for (const entry of raw.split('\u001F')) {
    const match = CO_AUTHOR_VALUE_REGEX.exec(entry);
    if (match) {
      out.push({ name: match[1].trim(), email: match[2].trim() });
    }
  }
  return out;
}

export function parseGitLog(raw: string): RawCommit[] {
  const commits: RawCommit[] = [];
  let current: RawCommit | null = null;

  for (const line of raw.split('\n')) {
    if (line.startsWith('COMMIT|')) {
      if (current) commits.push(current);
      const [, hash, authorEmail, authorName, date] = line.split('|');
      current = {
        hash,
        authorEmail,
        authorName,
        date,
        message: '',
        coAuthors: [],
        files: [],
        fileStats: [],
        insertions: 0,
        deletions: 0,
      };
    } else if (current && line.startsWith('MSG|')) {
      current.message = line.slice(4); // everything after "MSG|"
    } else if (current && line.startsWith('TRAILERS|')) {
      current.coAuthors = parseCoAuthorValues(line.slice(9));
    } else if (current && line.trim()) {
      // numstat lines: "insertions\tdeletions\tfilepath"
      const parts = line.split('\t');
      if (parts.length === 3) {
        const [ins, del, file] = parts;
        if (file && !file.includes('{')) {
          // skip rename noise like "src/{a => b}/file.ts"
          current.files.push(file);
          current.fileStats.push({
            file,
            insertions: parseInt(ins, 10) || 0,
            deletions: parseInt(del, 10) || 0,
          });
          current.insertions += parseInt(ins, 10) || 0;
          current.deletions += parseInt(del, 10) || 0;
        }
      }
    }
  }

  if (current) commits.push(current);
  return commits;
}

// ─── Noise file filtering ──────────────────────────────────────────────────────

const IGNORED_PATTERNS = {
  exact: new Set([
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    'bun.lockb',
    'next-env.d.ts',
    'vite-env.d.ts',
    'CONTRIBUTING.md',
    'CLAUDE.md',
  ]),
  // Binary / generated / vendored extensions that would pollute LOC counts
  // and churn analysis if treated as source.
  extensions: new Set([
    '.ico',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.webp',
    '.avif',
    '.pdf',
    '.wasm',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.min.js',
    '.min.css',
    '.map',
  ]),
  // Note: `docs/` is deliberately NOT filtered. Many projects keep real,
  // actively-maintained source under docs/ (MDX, generated API references,
  // ADRs) and silently excluding those skews every analyzer.
  prefixes: ['.next/', 'dist/', 'coverage/', '.claude/'],
};

export function isIgnored(file: string): boolean {
  const basename = file.split('/').pop() ?? file;

  if (IGNORED_PATTERNS.exact.has(basename)) return true;

  for (const ext of IGNORED_PATTERNS.extensions) {
    if (file.endsWith(ext)) return true;
  }

  for (const prefix of IGNORED_PATTERNS.prefixes) {
    if (file.startsWith(prefix)) return true;
  }

  return false;
}

/**
 * Returns all tracked files in the repo right now.
 */
export async function getTrackedFiles(repoPath: string): Promise<string[]> {
  const { stdout } = await execa('git', ['ls-files'], { cwd: repoPath });
  return stdout.split('\n').filter((f) => f && !isIgnored(f));
}

/**
 * Returns the current branch name.
 */
/**
 * Resolves the root of the working tree containing `startPath`, the same way a
 * bare `git` command does — so gitrelic can be invoked from any subdirectory
 * rather than only from the repo root.
 *
 * Delegating to `git rev-parse` rather than walking up looking for `.git` also
 * gets worktrees, submodules (where `.git` is a file, not a directory) and
 * `GIT_CEILING_DIRECTORIES` right for free.
 *
 * @param startPath - Any path inside the repository.
 * @returns The absolute path to the working-tree root, or null if `startPath`
 *   is not inside a git repository, does not exist, or git is unavailable.
 */
export async function resolveRepoRoot(
  startPath: string,
): Promise<string | null> {
  try {
    const { stdout } = await execa('git', ['rev-parse', '--show-toplevel'], {
      cwd: startPath,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function getCurrentBranch(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execa('git', ['branch', '--show-current'], {
      cwd: repoPath,
    });
    return stdout.trim() || 'HEAD';
  } catch {
    return 'HEAD';
  }
}

/**
 * Returns all local branch names.
 */
export async function getBranches(repoPath: string): Promise<string[]> {
  const { stdout } = await execa(
    'git',
    ['branch', '--format=%(refname:short)'],
    { cwd: repoPath },
  );
  return stdout.split('\n').filter(Boolean);
}

/**
 * Fetches the raw rename log for a repo. Returns an empty string if git fails,
 * so the rename-tracking analyzer can degrade gracefully.
 */
export async function getRenameLog(
  repoPath: string,
  options: { since?: string } = {},
): Promise<string> {
  const args = [
    'log',
    '--diff-filter=R',
    '--find-renames',
    '--name-status',
    '--format=COMMIT|%H|%aI',
    '--no-merges',
  ];

  if (options.since) args.push(`--since=${options.since}`);

  try {
    const { stdout } = await execa('git', args, { cwd: repoPath });
    return stdout;
  } catch {
    return '';
  }
}

/**
 * Detects the primary language by counting file extensions.
 */
export function detectPrimaryLanguage(files: string[]): string {
  const extCounts: Record<string, number> = {};
  const langMap: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TypeScript',
    js: 'JavaScript',
    jsx: 'JavaScript',
    py: 'Python',
    rb: 'Ruby',
    go: 'Go',
    rs: 'Rust',
    java: 'Java',
    cs: 'C#',
    cpp: 'C++',
    c: 'C',
    php: 'PHP',
    swift: 'Swift',
    kt: 'Kotlin',
  };

  for (const file of files) {
    const ext = file.split('.').pop()?.toLowerCase() ?? '';
    if (langMap[ext]) extCounts[ext] = (extCounts[ext] ?? 0) + 1;
  }

  const top = Object.entries(extCounts).sort((a, b) => b[1] - a[1])[0];
  return top ? (langMap[top[0]] ?? top[0]) : 'Unknown';
}
