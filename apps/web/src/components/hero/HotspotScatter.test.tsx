import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HotspotScatter, prepareScatterData } from './HotspotScatter';
import type { GitrelicReport } from '@gitrelic/core';

function makeReport(): GitrelicReport {
  return {
    churn: {
      files: [
        {
          file: 'a.ts',
          commitCount: 20,
          churnScore: 80,
          category: 'hot' as const,
        },
        {
          file: 'b.ts',
          commitCount: 5,
          churnScore: 20,
          category: 'cold' as const,
        },
      ],
      topFiles: [],
      hotspotCount: 1,
      summary: '',
    },
    loc: {
      totalFiles: 2,
      totalLines: 300,
      files: [
        { file: 'a.ts', lines: 200, language: 'TypeScript' },
        { file: 'b.ts', lines: 100, language: 'TypeScript' },
      ],
      languages: [],
      summary: '',
    },
    hotspots: {
      files: [
        {
          file: 'a.ts',
          hotspotScore: 90,
          churnScore: 80,
          loc: 200,
          category: 'critical' as const,
        },
        {
          file: 'b.ts',
          hotspotScore: 15,
          churnScore: 20,
          loc: 100,
          category: 'low' as const,
        },
      ],
      topHotspots: [],
      summary: '',
    },
  } as Partial<GitrelicReport> as GitrelicReport;
}

describe('prepareScatterData', () => {
  it('returns points with churn, loc, score, and category', () => {
    const points = prepareScatterData(makeReport());
    expect(points).toHaveLength(2);

    const a = points.find((p) => p.file === 'a.ts');
    expect(a).toEqual({
      file: 'a.ts',
      churn: 20,
      loc: 200,
      hotspotScore: 90,
      category: 'critical',
    });
  });

  it('only includes files present in both churn and loc', () => {
    const report = makeReport();
    report.churn.files.push({
      file: 'orphan.ts',
      commitCount: 10,
      churnScore: 50,
      category: 'warm' as const,
    });
    const points = prepareScatterData(report);
    expect(points.find((p) => p.file === 'orphan.ts')).toBeUndefined();
  });
});

describe('HotspotScatter rendering', () => {
  afterEach(() => cleanup());

  it('renders a caption explaining the axes', () => {
    // This hero shipped without one while 20 others had it, so an alt-tab
    // reader got an unlabelled scatter. It is the default hero for `hotspots`
    // and an alt for cursed-files, age-map and risk, so the gap was wide.
    render(
      <HotspotScatter
        report={makeReport()}
        selectedFile={null}
        onSelectFile={vi.fn()}
      />,
    );

    expect(screen.getByText(/x = commits/)).toBeTruthy();
    expect(screen.getByText(/y = lines of code/)).toBeTruthy();
    expect(screen.getByText(/Top-right is the danger zone/)).toBeTruthy();
  });
});
