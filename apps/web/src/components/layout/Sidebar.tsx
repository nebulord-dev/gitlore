import { PRESETS } from '../../presets/registry';
import { cn } from '../../utils/cn';
import type { PresetId, SidebarGroupLabel } from '../../presets/types';
import type { GitrelicReport } from '@gitrelic/core';

interface SidebarProps {
  report: GitrelicReport;
  activePresetId: PresetId;
  onApplyPreset: (id: PresetId) => void;
}

interface NavEntry {
  id: PresetId;
  label: string;
  badge?: number;
}

interface NavGroup {
  label: string;
  groupId: SidebarGroupLabel | 'dashboard-group';
  items: NavEntry[];
}

function getNavGroups(report: GitrelicReport): NavGroup[] {
  const dashboardPresets = (['overview', 'risk', 'tech-debt'] as const).map(
    (id) => ({
      id,
      label: PRESETS[id].label,
    }),
  ) satisfies NavEntry[];

  return [
    {
      label: 'Overview',
      groupId: 'dashboard-group',
      items: dashboardPresets,
    },
    {
      label: 'Code Health',
      groupId: 'code-health',
      items: [
        {
          id: 'hotspots',
          label: 'Hotspots',
          badge: report.hotspots.topHotspots.filter(
            (h) => h.category === 'critical',
          ).length,
        },
        {
          id: 'churn',
          label: 'Churn',
          badge: report.churn.files.filter((f) => f.churnScore > 75).length,
        },
        {
          id: 'cursed-files',
          label: 'Cursed Files',
          badge: report.cursedFiles.files.filter((c) => c.curseScore >= 70)
            .length,
        },
        {
          id: 'dead-code',
          label: 'Stale Files',
          badge: report.deadCode.totalDeadFiles,
        },
        {
          id: 'blast-radius',
          label: 'Blast Radius',
        },
        {
          id: 'complexity-trend',
          label: 'Complexity Trend',
          badge: report.complexityTrend.growingFiles.length,
        },
        {
          id: 'age-map',
          label: 'Age Map',
          badge: report.ageMap.ancientFiles.length,
        },
        {
          id: 'rewrite-ratio',
          label: 'Rewrite Ratio',
          badge: report.rewriteRatio.topRewriters.length,
        },
        {
          id: 'shame',
          label: 'Shame',
          badge: report.forensics.files.filter((f) => f.shameScore >= 70)
            .length,
        },
        // NOTE: Stream 3 will add the other Code Health presets here.
      ],
    },
    {
      label: 'Ownership & Risk',
      groupId: 'ownership-risk',
      items: [
        {
          id: 'bus-factor',
          label: 'Bus Factor',
          badge: report.busFactors.criticalFiles.length,
        },
        {
          id: 'coupling',
          label: 'Coupling',
        },
        {
          id: 'knowledge-silos',
          label: 'Knowledge Silos',
          badge: report.knowledgeConcentration.singleAuthorFiles,
        },
        {
          id: 'ghost-files',
          label: 'Ghost Files',
          badge: report.ghostFiles.totalGhostFiles,
        },
      ],
    },
    {
      label: 'Team & Activity',
      groupId: 'team-activity',
      items: [
        { id: 'contributors', label: 'Contributors' },
        {
          id: 'parallel-dev',
          label: 'Parallel Dev',
          badge: report.parallelDev.hotFiles.length,
        },
        {
          id: 'commit-timing',
          label: 'Commit Timing',
          badge: report.commitTiming.highStress,
        },
        {
          id: 'co-authors',
          label: 'Co-Authors / AI',
          badge: report.coAuthors.pairs.length,
        },
      ],
    },
    {
      label: 'Structure',
      groupId: 'structure',
      items: [
        { id: 'languages', label: 'Languages' },
        {
          id: 'test-coverage',
          label: 'Test Coverage',
          badge: report.testCoverage.uncoveredDirectories.length,
        },
        {
          id: 'renames',
          label: 'Renames',
          badge: report.renameTracking.filesWithRenames,
        },
      ],
    },
  ];
}

export function Sidebar({
  report,
  activePresetId,
  onApplyPreset,
}: SidebarProps) {
  const groups = getNavGroups(report);

  return (
    <nav
      aria-label="Dashboard navigation"
      className="w-[200px] min-w-[200px] bg-surface-primary border-r border-border-primary py-3 overflow-y-auto shrink-0"
    >
      {groups.map((group) => (
        <div key={group.label} className="mb-4 px-3 py-1">
          <div className="text-[9px] uppercase tracking-[1.5px] text-text-tertiary py-2 px-2">
            {group.label}
          </div>
          {group.items.map((item) => {
            const isActive = activePresetId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onApplyPreset(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 w-full py-1.5 px-2 border-none rounded-md cursor-pointer text-xs text-left mb-0.5',
                  isActive
                    ? 'bg-nav-item-active-bg text-accent-primary'
                    : 'bg-transparent text-text-secondary',
                )}
              >
                <span className="flex-1">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="text-[9px] py-px px-[5px] rounded-lg font-semibold bg-nav-badge-critical text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
