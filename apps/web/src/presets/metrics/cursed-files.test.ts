import { describe, expect, it } from 'vitest';

import { cursedFilesMetrics } from './cursed-files';
import type { CursedFile, GitrelicReport } from '@gitrelic/core';

function makeFile(overrides: Partial<CursedFile> = {}): CursedFile {
  return {
    file: 'a.ts',
    curseScore: 50,
    reasons: [],
    churn: 10,
    authors: 2,
    ageDays: 100,
    narrative: '',
    ...overrides,
  };
}

function makeReport(files: CursedFile[]): GitrelicReport {
  return {
    cursedFiles: { files, excludedBotFiles: [], summary: '' },
  } as unknown as GitrelicReport;
}

describe('cursedFilesMetrics', () => {
  it('returns healthy/em-dash values when list is empty', () => {
    const metrics = cursedFilesMetrics(makeReport([]));
    expect(metrics).toHaveLength(4);
    expect(metrics[0]).toMatchObject({ label: 'Cursed Files', value: '0' });
    expect(metrics[0].color).toBe('var(--severity-healthy)');
    expect(metrics[1]).toMatchObject({ label: 'Top Curse Score', value: '—' });
    expect(metrics[1].color).toBe('var(--severity-healthy)');
    expect(metrics[2]).toMatchObject({ label: 'Critical (≥70)', value: '0' });
    expect(metrics[2].color).toBe('var(--severity-healthy)');
    expect(metrics[3]).toMatchObject({ label: 'Avg Authors', value: '—' });
  });

  it('returns correct aggregates for a non-empty list', () => {
    const cursedFiles = [
      makeFile({ file: 'a.ts', curseScore: 85, authors: 4 }),
      makeFile({ file: 'b.ts', curseScore: 65, authors: 2 }),
    ];
    const metrics = cursedFilesMetrics(makeReport(cursedFiles));
    expect(metrics[0].value).toBe('2');
    expect(metrics[1].value).toBe('85');
    expect(metrics[2].value).toBe('1');
    expect(metrics[3].value).toBe('3');
  });

  it('colors Top Curse Score as critical at or above the 70 threshold', () => {
    const metrics = cursedFilesMetrics(
      makeReport([makeFile({ curseScore: 70 })]),
    );
    expect(metrics[1].color).toBe('var(--severity-critical)');
  });

  it('colors Top Curse Score as warning below the 70 threshold', () => {
    const metrics = cursedFilesMetrics(
      makeReport([makeFile({ curseScore: 60 })]),
    );
    expect(metrics[1].color).toBe('var(--severity-warning)');
  });

  it('rounds Avg Authors to one decimal place', () => {
    const cursedFiles = [
      makeFile({ file: 'a.ts', authors: 1 }),
      makeFile({ file: 'b.ts', authors: 2 }),
      makeFile({ file: 'c.ts', authors: 2 }),
    ];
    const metrics = cursedFilesMetrics(makeReport(cursedFiles));
    expect(metrics[3].value).toBe('1.7');
  });
});
