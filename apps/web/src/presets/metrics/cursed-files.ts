import { fmt } from '../../components/theme';
import type { Metric } from '../types';
import type { GitrelicReport } from '@gitrelic/core';

export function cursedFilesMetrics(report: GitrelicReport): Metric[] {
  const cursed = report.cursedFiles.files;
  const cursedCount = cursed.length;
  const topScore = cursed.reduce(
    (max, c) => (c.curseScore > max ? c.curseScore : max),
    0,
  );
  const criticalCount = cursed.filter((c) => c.curseScore >= 70).length;
  const avgAuthors =
    cursed.length > 0
      ? Math.round(
          (cursed.reduce((sum, c) => sum + c.authors, 0) / cursed.length) * 10,
        ) / 10
      : 0;

  return [
    {
      label: 'Cursed Files',
      value: fmt(cursedCount),
      color:
        cursedCount > 0
          ? 'var(--severity-critical)'
          : 'var(--severity-healthy)',
    },
    {
      label: 'Top Curse Score',
      value: cursedCount > 0 ? String(topScore) : '—',
      color:
        cursedCount === 0
          ? 'var(--severity-healthy)'
          : topScore >= 70
            ? 'var(--severity-critical)'
            : 'var(--severity-warning)',
    },
    {
      label: 'Critical (≥70)',
      value: String(criticalCount),
      color:
        criticalCount > 0
          ? 'var(--severity-critical)'
          : 'var(--severity-healthy)',
    },
    {
      label: 'Avg Authors',
      value: cursedCount > 0 ? String(avgAuthors) : '—',
      color: 'var(--accent-primary)',
    },
  ];
}
