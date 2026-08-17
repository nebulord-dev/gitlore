import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid(
  defineConfig({
    title: 'GitRelic',
    description:
      'Git archaeology for your repository — churn, bus factor, hotspots, and cursed files.',
    base: '/gitrelic/',
    appearance: 'dark',
    lastUpdated: true,

    // Known future analyzer pages cross-linked from existing docs. Drop entries
    // as their pages land so genuine typos still surface in the build.
    ignoreDeadLinks: [
      '/analyzers/hotspots',
      '/analyzers/churn-velocity',
      '/analyzers/coupling',
      '/analyzers/knowledge-silos',
      '/analyzers/dead-code',
      '/analyzers/complexity-trend',
    ],

    themeConfig: {
      nav: [
        {
          text: 'Changelog',
          link: 'https://github.com/nebulord-dev/gitrelic/blob/main/CHANGELOG.md',
        },
        {
          text: 'Contributing',
          link: 'https://github.com/nebulord-dev/gitrelic/blob/main/CONTRIBUTING.md',
        },
      ],

      sidebar: [
        {
          text: 'Getting Started',
          collapsed: false,
          items: [{ text: 'Introduction', link: '/guide/introduction' }],
        },
        {
          text: 'Guide',
          collapsed: false,
          items: [{ text: 'Core Concepts', link: '/guide/concepts' }],
        },
        {
          text: 'Analyzers',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/analyzers/' },
            { text: 'Age Map', link: '/analyzers/age-map' },
            { text: 'Blast Radius', link: '/analyzers/blast-radius' },
            { text: 'Bus Factor', link: '/analyzers/bus-factor' },
            { text: 'Churn', link: '/analyzers/churn' },
            { text: 'Co-Authors / AI', link: '/analyzers/co-authors' },
            { text: 'Commit Timing', link: '/analyzers/commit-timing' },
            { text: 'Contributors', link: '/analyzers/contributors' },
            { text: 'Cursed Files', link: '/analyzers/cursed-files' },
            { text: 'Ghost Files', link: '/analyzers/ghost-files' },
            { text: 'Parallel Dev', link: '/analyzers/parallel-dev' },
            { text: 'Renames', link: '/analyzers/renames' },
            { text: 'Rewrite Ratio', link: '/analyzers/rewrite-ratio' },
            { text: 'Shame', link: '/analyzers/shame' },
          ],
        },
        {
          text: 'Web Dashboard',
          collapsed: false,
          items: [{ text: 'Overview', link: '/dashboard/' }],
        },
        {
          text: 'Advanced',
          collapsed: false,
          items: [{ text: 'Overview', link: '/advanced/' }],
        },
      ],

      // No socialLinks — repo is private, would 404 for outsiders
      // Add { icon: 'github', link: '...' } when going public

      search: {
        provider: 'local',
      },

      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright 2026-present Nebulord',
      },
    },

    // Force pre-bundle of mermaid in dev so its CJS dayjs dep doesn't trip
    // Vite's ESM analysis. Build mode is unaffected.
    vite: {
      optimizeDeps: {
        include: ['mermaid'],
      },
    },
  }),
);
