import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { useState, useEffect } from 'react';
import { runGitrelic, resolveRepoRoot } from '@gitrelic/core';
import { program } from 'commander';
import { render } from 'ink';
import open from 'open';

import { App } from './components/App.js';
import type { GitrelicReport } from '@gitrelic/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'),
);

program
  .name('gitrelic')
  .description(
    'Git archaeology — understand the history and health of your codebase',
  )
  .version(pkg.version, '-v, --version')
  .option(
    '-p, --path <path>',
    'Path to the git repository, or any directory inside it',
    process.cwd(),
  )
  .option(
    '-b, --branch <branch>',
    'Branch to analyze (default: current branch)',
  )
  .option(
    '-s, --since <date>',
    'Only analyze commits since this date (default: "12 months ago", use "all" for full history)',
    '12 months ago',
  )
  .option('--web', 'Open web dashboard after analysis')
  .option('--json', 'Output raw JSON report to stdout')
  .option('--shame', 'Show commit message forensics / shame leaderboard panel')
  .option('--parallel', 'Show parallel development leaderboard panel')
  .parse();

const opts = program.opts<{
  path: string;
  branch?: string;
  since?: string;
  web?: boolean;
  json?: boolean;
  shame?: boolean;
  parallel?: boolean;
}>();

const inputPath = path.resolve(opts.path);
const since = opts.since === 'all' ? undefined : opts.since;

// Validate the repo path up front so we can fail with a clean message instead
// of a buried git stderr trace from deep inside the analyzer stack.
if (!existsSync(inputPath)) {
  process.stderr.write(`Error: path does not exist: ${inputPath}\n`);
  process.exit(1);
}

// Resolve to the working-tree root so gitrelic can be run from any
// subdirectory, the way every other git command can. Checking for `.git`
// directly would only ever match the repo root.
let resolvedRoot: string | null = null;
try {
  resolvedRoot = await resolveRepoRoot(inputPath);
} catch (err) {
  // Thrown only when git itself is missing. Reporting that as "not a git
  // repository" would send the user to debug the one thing that isn't wrong.
  process.stderr.write(`Error: ${(err as Error).message}\n`);
  process.exit(1);
}
if (!resolvedRoot) {
  process.stderr.write(
    `Error: not a git repository: ${inputPath}\n` +
      'Run gitrelic from inside a git repository, or point it at one with --path <repo>.\n',
  );
  process.exit(1);
}
// Re-bound so the non-null type reaches the React callbacks below — control-flow
// narrowing from the process.exit() guard doesn't survive into those closures.
const repoPath: string = resolvedRoot;

if (opts.json) {
  // Non-interactive JSON mode
  try {
    const report = await runGitrelic({
      repoPath,
      branch: opts.branch,
      since,
    });
    process.stdout.write(JSON.stringify(report, null, 2));
    process.exit(0);
  } catch (err) {
    process.stderr.write(`Error: ${(err as Error).message}\n`);
    process.exit(1);
  }
}

// Interactive Ink mode.
function GitrelicApp() {
  const [report, setReport] = useState<GitrelicReport | null>(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [webPort, setWebPort] = useState<number | undefined>(undefined);
  // Drives unmount from a useEffect so React has a full render cycle to flush
  // the final frame (report or error) before Ink tears down. Setting this to
  // true triggers the effect *after* the state update that caused it has been
  // painted, avoiding the race where unmount() fires before the output appears.
  const [shouldExit, setShouldExit] = useState(false);

  useEffect(() => {
    if (shouldExit) inkInstance.unmount();
  }, [shouldExit]);

  useEffect(() => {
    runGitrelic({
      repoPath,
      branch: opts.branch,
      since,
      onProgress: setProgress,
    })
      .then(async (result) => {
        setReport(result);
        if (opts.web) {
          const port = await serveWebDashboard(result);
          setWebPort(port);
        } else {
          setShouldExit(true);
        }
      })
      .catch((err: Error) => {
        setError(err.message);
        process.exitCode = 1;
        setShouldExit(true);
      });
  }, []);

  return (
    <App
      report={report}
      progress={progress}
      error={error}
      version={pkg.version}
      showShame={opts.shame ?? false}
      showParallel={opts.parallel ?? false}
      webPort={webPort}
    />
  );
}

// Capture the render instance so success/error paths can unmount cleanly.
// waitUntilExit() resolves once unmount() is called, allowing the process
// to exit naturally without fragile setTimeout delays.
const inkInstance = render(<GitrelicApp />);
await inkInstance.waitUntilExit();

async function serveWebDashboard(report: GitrelicReport): Promise<number> {
  // The web dashboard is copied into the cli's own dist/web/ at build time
  // (see scripts/copy-web-dist.mjs) so it ships inside the published package
  // and resolves identically in the monorepo and in node_modules installs.
  // `import.meta.url` points at `.../dist/index.js`, so `./web` resolves to
  // `.../dist/web/`.
  //
  // Use fileURLToPath rather than URL#pathname: on Windows, pathname returns
  // `/C:/Users/...` with a leading slash before the drive letter, which the
  // fs module can't open. fileURLToPath normalizes it to a real OS path.
  const webDist = fileURLToPath(new URL('./web', import.meta.url));
  const port = await getFreePort(7777);

  const server = createServer((req, res) => {
    if (req.url === '/gitrelic-report.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(report));
      return;
    }

    // Decode the URL and strip the query string. decodeURIComponent handles
    // percent-encoded traversal sequences (e.g. `/%2e%2e/etc/passwd`) so the
    // explicit `..` / null-byte check below sees them in normalized form.
    let decoded: string;
    try {
      const rawUrl = (req.url ?? '/').split('?')[0];
      decoded = decodeURIComponent(rawUrl);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }

    // Hard-reject any traversal indicator or null byte before touching the
    // filesystem. This is the primary sanitizer — `path.resolve` + boundary
    // check below is defense-in-depth.
    if (decoded.includes('..') || decoded.includes('\0')) {
      res.writeHead(400);
      res.end();
      return;
    }

    // Collapse to a safe relative segment, then join (not resolve) under the
    // dist root. `path.basename`-per-segment normalization ensures every
    // segment is a simple filename — no '.', no '..', no absolute anchors.
    const rel = decoded.replace(/^\/+/, '');
    const safeSegments = rel
      .split('/')
      .filter((seg) => seg.length > 0)
      .map((seg) => path.basename(seg));
    const safeRel = safeSegments.join('/');
    const candidate =
      safeRel === ''
        ? path.join(webDist, 'index.html')
        : path.join(webDist, safeRel);

    // Belt-and-braces boundary check. With the explicit rejections above this
    // should be unreachable, but keeping it protects against any future change
    // that relaxes the input validation.
    const boundary = webDist.endsWith(path.sep) ? webDist : webDist + path.sep;
    if (!candidate.startsWith(boundary) && candidate !== webDist) {
      res.writeHead(403);
      res.end();
      return;
    }

    if (existsSync(candidate)) {
      const ext = path.extname(candidate);
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.map': 'application/json',
        '.wasm': 'application/wasm',
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] ?? 'text/plain' });
      res.end(readFileSync(candidate));
    } else {
      // SPA fallback
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(readFileSync(path.join(webDist, 'index.html')));
    }
  });

  // Surface any unexpected listen errors with a clean message. Port conflicts
  // are already handled upstream by getFreePort, which walks forward until it
  // finds a free port.
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });
  // Structured line for machine consumption (CI, scripts). Ink's colored
  // output can embed ANSI codes that break naive grep; this is always clean.
  process.stderr.write(`GITRELIC_PORT=${port}\n`);
  await open(`http://localhost:${port}`);
  return port;
}

async function getFreePort(preferred: number, attempts = 0): Promise<number> {
  if (attempts >= 10) {
    throw new Error(
      `No free port found after 10 attempts starting from port ${preferred - attempts}`,
    );
  }
  return new Promise((resolve, reject) => {
    const probe = createServer();
    // Probe must bind to the same host as the real server (127.0.0.1), otherwise
    // Node defaults to `::` and we can miss an IPv4-loopback-only conflict —
    // the probe says "free", then the real listen crashes with EADDRINUSE.
    probe.listen(preferred, '127.0.0.1', () => {
      const addr = probe.address() as { port: number };
      probe.close(() => resolve(addr.port));
    });
    probe.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(getFreePort(preferred + 1, attempts + 1));
      } else {
        reject(err);
      }
    });
  });
}
