import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CursedFilesTab } from './CursedFilesTab';
import type { CursedFile, GitrelicReport } from '@gitrelic/core';

function c(file: string, curseScore: number): CursedFile {
  return {
    file,
    curseScore,
    reasons: ['Single author owns 100% of changes'],
    churn: 10,
    authors: 1,
    ageDays: 30,
    narrative: `${file} is a single point of failure.`,
  };
}

function makeReport(
  files: CursedFile[],
  excludedBotFiles: string[] = [],
): GitrelicReport {
  return {
    cursedFiles: { files, excludedBotFiles, summary: '' },
    busFactors: { files: [] },
  } as unknown as GitrelicReport;
}

describe('CursedFilesTab', () => {
  afterEach(() => cleanup());

  it('lists withheld bot files when no cursed files remain', () => {
    render(
      <CursedFilesTab
        report={makeReport([], ['CHANGELOG.md', 'apps/cli/package.json'])}
        onSelectFile={vi.fn()}
      />,
    );

    expect(screen.getByText('No cursed files found.')).toBeTruthy();
    expect(
      screen.getByText(/withheld as machine-generated churn/),
    ).toBeTruthy();
    expect(screen.getByText('CHANGELOG.md')).toBeTruthy();
    expect(screen.getByText('package.json')).toBeTruthy();
  });

  it('still lists withheld bot files when cursed files survive', () => {
    // The case the empty-state-only version dropped: withholding is only
    // transparent if it is reported whenever it happens, not just when it
    // happens to empty the table.
    render(
      <CursedFilesTab
        report={makeReport([c('src/app.ts', 80)], ['CHANGELOG.md'])}
        onSelectFile={vi.fn()}
      />,
    );

    expect(screen.getByText('app.ts')).toBeTruthy();
    expect(screen.getByText(/1 file withheld/)).toBeTruthy();
    expect(screen.getByText('CHANGELOG.md')).toBeTruthy();
  });

  it('omits the withheld block entirely when nothing was excluded', () => {
    render(
      <CursedFilesTab
        report={makeReport([c('src/app.ts', 80)])}
        onSelectFile={vi.fn()}
      />,
    );

    expect(screen.getByText('app.ts')).toBeTruthy();
    expect(screen.queryByText(/withheld/)).toBeNull();
  });
});
