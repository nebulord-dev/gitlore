import { ageMapMetrics } from './metrics/age-map';
import { blastRadiusMetrics } from './metrics/blast-radius';
import { busFactorMetrics } from './metrics/bus-factor';
import { churnMetrics } from './metrics/churn';
import { coAuthorsMetrics } from './metrics/co-authors';
import { commitTimingMetrics } from './metrics/commit-timing';
import { complexityTrendMetrics } from './metrics/complexity-trend';
import { contributorsMetrics } from './metrics/contributors';
import { couplingMetrics } from './metrics/coupling';
import { cursedFilesMetrics } from './metrics/cursed-files';
import { deadCodeMetrics } from './metrics/dead-code';
import { ghostFilesMetrics } from './metrics/ghost-files';
import { hotspotsMetrics } from './metrics/hotspots';
import { knowledgeSilosMetrics } from './metrics/knowledge-silos';
import { languagesMetrics } from './metrics/languages';
import { overviewMetrics } from './metrics/overview';
import { parallelDevMetrics } from './metrics/parallel-dev';
import { renamesMetrics } from './metrics/renames';
import { rewriteRatioMetrics } from './metrics/rewrite-ratio';
import { riskMetrics } from './metrics/risk';
import { shameMetrics } from './metrics/shame';
import { techDebtMetrics } from './metrics/tech-debt';
import { testCoverageMetrics } from './metrics/test-coverage';
import type { PresetDefinition, PresetId } from './types';

export const PRESETS: Record<PresetId, PresetDefinition> = {
  overview: {
    id: 'overview',
    tier: 'dashboard',
    label: 'Overview',
    group: 'overview',
    hero: {
      defaultViz: 'treemap',
      altTabs: [
        'treemap',
        'ownership',
        'coupling',
        'commit-graph',
        'scatter',
        'timeline',
        'swimlanes',
      ],
    },
    bottomPanel: {
      defaultTab: 'hotspots',
      altTabs: [
        'hotspots',
        'cursed-files',
        'bus-factor',
        'churn-velocity',
        'ghost-files',
      ],
    },
    metrics: overviewMetrics,
  },
  risk: {
    id: 'risk',
    tier: 'dashboard',
    label: 'Risk',
    group: 'overview',
    hero: {
      defaultViz: 'risk-heatmap',
      altTabs: ['risk-heatmap', 'ownership-sunburst'],
    },
    bottomPanel: {
      defaultTab: 'risk-register',
      altTabs: [
        'risk-register',
        'bus-factor',
        'ghost-files',
        'knowledge-silos',
      ],
    },
    metrics: riskMetrics,
  },
  'tech-debt': {
    id: 'tech-debt',
    tier: 'dashboard',
    label: 'Tech Debt',
    group: 'overview',
    hero: {
      defaultViz: 'growth-timeline',
      altTabs: ['growth-timeline', 'debt-scatter'],
    },
    bottomPanel: {
      defaultTab: 'debt-inventory',
      altTabs: [
        'debt-inventory',
        'dead-code',
        'complexity-trend',
        'rewrite-ratio',
        'churn-velocity',
      ],
    },
    metrics: techDebtMetrics,
  },
  // Tier 2 entries (Tasks 2.11 – 2.14) go below this line.
  hotspots: {
    id: 'hotspots',
    tier: 'analyzer',
    label: 'Hotspots',
    group: 'code-health',
    hero: {
      defaultViz: 'scatter',
      altTabs: ['scatter', 'treemap', 'risk-heatmap'],
    },
    bottomPanel: {
      defaultTab: 'hotspots',
      altTabs: ['hotspots'],
    },
    metrics: hotspotsMetrics,
  },
  'bus-factor': {
    id: 'bus-factor',
    tier: 'analyzer',
    label: 'Bus Factor',
    group: 'ownership-risk',
    hero: {
      defaultViz: 'bus-factor-histogram',
      altTabs: ['bus-factor-histogram', 'ownership-bar'],
    },
    bottomPanel: {
      defaultTab: 'bus-factor',
      altTabs: ['bus-factor', 'knowledge-silos'],
    },
    metrics: busFactorMetrics,
    docsPath: 'analyzers/bus-factor',
  },
  coupling: {
    id: 'coupling',
    tier: 'analyzer',
    label: 'Coupling',
    group: 'ownership-risk',
    hero: {
      defaultViz: 'coupling',
      altTabs: ['coupling'],
    },
    bottomPanel: {
      defaultTab: 'coupling',
      altTabs: ['coupling'],
    },
    metrics: couplingMetrics,
  },
  contributors: {
    id: 'contributors',
    tier: 'analyzer',
    label: 'Contributors',
    group: 'team-activity',
    hero: {
      defaultViz: 'swimlanes',
      altTabs: ['swimlanes', 'ownership'],
    },
    bottomPanel: {
      defaultTab: 'contributors',
      altTabs: ['contributors'],
    },
    metrics: contributorsMetrics,
    docsPath: 'analyzers/contributors',
  },
  'cursed-files': {
    id: 'cursed-files',
    tier: 'analyzer',
    label: 'Cursed Files',
    group: 'code-health',
    hero: {
      // `treemap` (ChurnTreemap) is stripped per the RELIC-333 firehose rule: it
      // renders every file in the repo by churn. It still lives in Churn /
      // Overview, where it answers the right question.
      //
      // Caveat, deliberately recorded rather than papered over: RiskHeatmap does
      // not read `report.cursedFiles` either, and is also the `risk` preset's
      // default. It is a closer proxy — it composes the same ownership, blast
      // radius and shame inputs that feed curseScore — but this preset still has
      // no curse-score-native hero. Tracked as follow-up; promoting the existing
      // alt was chosen over building one in this pass.
      defaultViz: 'risk-heatmap',
      altTabs: ['risk-heatmap', 'scatter'],
    },
    bottomPanel: {
      defaultTab: 'cursed-files',
      altTabs: ['cursed-files'],
    },
    metrics: cursedFilesMetrics,
  },
  churn: {
    id: 'churn',
    tier: 'analyzer',
    label: 'Churn',
    group: 'code-health',
    heroLabel: 'Churn — file commit frequency',
    hero: {
      defaultViz: 'churn-bar',
      altTabs: ['churn-bar'],
    },
    bottomPanel: {
      defaultTab: 'churn',
      altTabs: ['churn', 'churn-tests'],
    },
    metrics: churnMetrics,
    docsPath: 'analyzers/churn',
  },
  'dead-code': {
    id: 'dead-code',
    tier: 'analyzer',
    label: 'Stale Files',
    group: 'code-health',
    hero: {
      defaultViz: 'staleness-scatter',
      altTabs: ['staleness-scatter', 'scatter', 'treemap'],
    },
    bottomPanel: {
      defaultTab: 'dead-code',
      altTabs: ['dead-code'],
    },
    metrics: deadCodeMetrics,
  },
  'blast-radius': {
    id: 'blast-radius',
    tier: 'analyzer',
    label: 'Blast Radius',
    group: 'code-health',
    hero: {
      defaultViz: 'blast-histogram',
      altTabs: ['blast-histogram'],
    },
    bottomPanel: {
      defaultTab: 'blast-radius',
      altTabs: ['blast-radius'],
    },
    metrics: blastRadiusMetrics,
    docsPath: 'analyzers/blast-radius',
  },
  'complexity-trend': {
    id: 'complexity-trend',
    tier: 'analyzer',
    label: 'Complexity Trend',
    group: 'code-health',
    hero: {
      defaultViz: 'growth-timeline',
      altTabs: ['growth-timeline', 'debt-scatter'],
    },
    bottomPanel: {
      defaultTab: 'complexity-trend',
      altTabs: ['complexity-trend'],
    },
    metrics: complexityTrendMetrics,
  },
  'knowledge-silos': {
    id: 'knowledge-silos',
    tier: 'analyzer',
    label: 'Knowledge Silos',
    group: 'ownership-risk',
    hero: {
      defaultViz: 'ownership-sunburst-silos',
      altTabs: ['ownership-sunburst-silos', 'ownership-sunburst', 'ownership'],
    },
    bottomPanel: {
      defaultTab: 'knowledge-silos',
      altTabs: ['knowledge-silos'],
    },
    metrics: knowledgeSilosMetrics,
  },
  'parallel-dev': {
    id: 'parallel-dev',
    tier: 'analyzer',
    label: 'Parallel Dev',
    group: 'team-activity',
    hero: {
      defaultViz: 'parallel-score-histogram',
      altTabs: ['parallel-score-histogram', 'parallel-timeline'],
    },
    bottomPanel: {
      defaultTab: 'parallel-dev',
      altTabs: ['parallel-dev'],
    },
    metrics: parallelDevMetrics,
    docsPath: 'analyzers/parallel-dev',
  },
  'age-map': {
    id: 'age-map',
    tier: 'analyzer',
    label: 'Age Map',
    group: 'code-health',
    hero: {
      defaultViz: 'age-histogram',
      altTabs: ['age-histogram'],
    },
    bottomPanel: {
      defaultTab: 'age-map',
      altTabs: ['age-map', 'age-map-by-directory'],
    },
    metrics: ageMapMetrics,
    docsPath: 'analyzers/age-map',
  },
  languages: {
    id: 'languages',
    tier: 'analyzer',
    label: 'Languages',
    group: 'structure',
    hero: {
      defaultViz: 'languages-stacked',
      altTabs: ['languages-stacked', 'treemap'],
    },
    bottomPanel: {
      defaultTab: 'languages',
      altTabs: ['languages'],
    },
    metrics: languagesMetrics,
  },
  'test-coverage': {
    id: 'test-coverage',
    tier: 'analyzer',
    label: 'Test Coverage',
    group: 'structure',
    hero: {
      defaultViz: 'treemap-test',
      altTabs: ['treemap-test', 'test-coverage-by-dir'],
    },
    bottomPanel: {
      defaultTab: 'test-coverage',
      altTabs: ['test-coverage'],
    },
    metrics: testCoverageMetrics,
  },
  'rewrite-ratio': {
    id: 'rewrite-ratio',
    tier: 'analyzer',
    label: 'Rewrite Ratio',
    group: 'code-health',
    hero: {
      defaultViz: 'rewrite-diverging-bar',
      altTabs: ['rewrite-diverging-bar', 'rewrite-histogram'],
    },
    bottomPanel: {
      defaultTab: 'rewrite-ratio',
      altTabs: ['rewrite-ratio'],
    },
    metrics: rewriteRatioMetrics,
    docsPath: 'analyzers/rewrite-ratio',
  },
  'commit-timing': {
    id: 'commit-timing',
    tier: 'analyzer',
    label: 'Commit Timing',
    group: 'team-activity',
    hero: {
      defaultViz: 'punch-card',
      altTabs: ['punch-card', 'stress-trend'],
    },
    bottomPanel: {
      defaultTab: 'commit-timing',
      altTabs: ['commit-timing'],
    },
    metrics: commitTimingMetrics,
    docsPath: 'analyzers/commit-timing',
  },
  'ghost-files': {
    id: 'ghost-files',
    tier: 'analyzer',
    label: 'Ghost Files',
    group: 'ownership-risk',
    hero: {
      defaultViz: 'ownership-sunburst-ghosts',
      altTabs: ['ownership-sunburst-ghosts'],
    },
    bottomPanel: {
      defaultTab: 'ghost-files',
      altTabs: ['ghost-files'],
    },
    metrics: ghostFilesMetrics,
    docsPath: 'analyzers/ghost-files',
  },
  'co-authors': {
    id: 'co-authors',
    tier: 'analyzer',
    label: 'Co-Authors / AI',
    group: 'team-activity',
    heroLabel: 'Co-Authors / AI — adoption & collaboration',
    hero: {
      defaultViz: 'ai-adoption',
      altTabs: ['ai-adoption', 'per-author-ai-mix', 'author-force-graph'],
    },
    bottomPanel: {
      defaultTab: 'co-authors-ai-adoption',
      altTabs: ['co-authors-ai-adoption', 'co-authors-pairs'],
    },
    metrics: coAuthorsMetrics,
    docsPath: 'analyzers/co-authors',
  },
  shame: {
    id: 'shame',
    tier: 'analyzer',
    label: 'Shame',
    group: 'code-health',
    heroLabel: 'Shame — commit-message forensics',
    hero: {
      defaultViz: 'shame-trend',
      altTabs: ['shame-trend', 'shame-leaderboard'],
    },
    bottomPanel: {
      defaultTab: 'shame',
      altTabs: ['shame'],
    },
    metrics: shameMetrics,
    docsPath: 'analyzers/shame',
  },
  renames: {
    id: 'renames',
    tier: 'analyzer',
    label: 'Renames',
    group: 'structure',
    hero: {
      defaultViz: 'rename-sankey',
      altTabs: ['rename-sankey'],
    },
    bottomPanel: {
      defaultTab: 'renames',
      altTabs: ['renames'],
    },
    metrics: renamesMetrics,
    docsPath: 'analyzers/renames',
  },
};
