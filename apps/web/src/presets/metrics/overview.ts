import type { Metric } from '../types';
import type { GitrelicReport } from '@gitrelic/core';

export function overviewMetrics(report: GitrelicReport): Metric[] {
  const criticalCount = report.hotspots.topHotspots.filter(
    (h) => h.category === 'critical',
  ).length;

  return [
    {
      label: 'Cursed Files',
      value: String(report.cursedFiles.files.length),
      color:
        report.cursedFiles.files.length > 0
          ? 'var(--severity-critical)'
          : 'var(--severity-healthy)',
    },
    {
      label: 'Hotspots',
      value: String(criticalCount),
      color:
        criticalCount > 3
          ? 'var(--severity-critical)'
          : criticalCount > 0
            ? 'var(--severity-warning)'
            : 'var(--severity-healthy)',
    },
    {
      label: 'Bus Factor Risks',
      value: String(report.busFactors.criticalFiles.length),
      color:
        report.busFactors.criticalFiles.length > 0
          ? 'var(--severity-warning)'
          : 'var(--severity-healthy)',
    },
    {
      label: 'Contributors',
      value: String(report.meta.totalAuthors),
      color: 'var(--accent-primary)',
    },
    {
      label: 'Repo Age',
      value: `${(report.meta.ageInDays / 365).toFixed(1)}y`,
      color: 'var(--text-primary)',
    },
  ];
}
