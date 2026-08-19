import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';

import { categoryColor } from '../../utils/colors';
import { HeroCaption } from '../shared/HeroCaption';
import type { GitrelicReport } from '@gitrelic/core';

interface HotspotScatterProps {
  report: GitrelicReport;
  selectedFile: string | null;
  onSelectFile: (file: string) => void;
}

export interface ScatterPoint {
  file: string;
  churn: number;
  loc: number;
  hotspotScore: number;
  category: string;
}

const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };

export function prepareScatterData(report: GitrelicReport): ScatterPoint[] {
  const locMap = new Map<string, number>();
  for (const f of report.loc.files) {
    locMap.set(f.file, f.lines);
  }

  const hotspotMap = new Map<string, { score: number; category: string }>();
  for (const h of report.hotspots.files) {
    hotspotMap.set(h.file, { score: h.hotspotScore, category: h.category });
  }

  const points: ScatterPoint[] = [];
  for (const c of report.churn.files) {
    const loc = locMap.get(c.file);
    const hotspot = hotspotMap.get(c.file);
    if (loc == null || !hotspot) continue;

    points.push({
      file: c.file,
      churn: c.commitCount,
      loc,
      hotspotScore: hotspot.score,
      category: hotspot.category,
    });
  }

  return points;
}

export function HotspotScatter({
  report,
  selectedFile,
  onSelectFile,
}: HotspotScatterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 400 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: ScatterPoint;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const points = useMemo(() => prepareScatterData(report), [report]);

  const { xScale, yScale, rScale } = useMemo(() => {
    const w = dims.width - PADDING.left - PADDING.right;
    const h = dims.height - PADDING.top - PADDING.bottom;
    const maxChurn = Math.max(...points.map((p) => p.churn), 1);
    const maxLoc = Math.max(...points.map((p) => p.loc), 1);
    const maxScore = Math.max(...points.map((p) => p.hotspotScore), 1);

    return {
      xScale: scaleLinear().domain([0, maxChurn]).range([0, w]),
      yScale: scaleLinear().domain([0, maxLoc]).range([h, 0]),
      rScale: scaleLinear().domain([0, maxScore]).range([3, 18]),
    };
  }, [points, dims.width, dims.height]);

  const plotW = dims.width - PADDING.left - PADDING.right;
  const plotH = dims.height - PADDING.top - PADDING.bottom;

  return (
    // containerRef stays on the plot wrapper rather than the outer flex column:
    // it both sizes the SVG and anchors the tooltip's coordinates, so measuring
    // the outer element would size the plot as if the caption weren't there.
    <div className="w-full h-full flex flex-col">
      <div ref={containerRef} className="flex-1 min-h-0 relative">
        <svg width={dims.width} height={dims.height}>
          <g transform={`translate(${PADDING.left},${PADDING.top})`}>
            {/* Quadrant hint */}
            <text
              x={plotW - 4}
              y={4}
              textAnchor="end"
              fontSize={9}
              fill="rgba(255,255,255,0.12)"
            >
              high churn + high complexity
            </text>

            {/* X axis */}
            <line
              x1={0}
              y1={plotH}
              x2={plotW}
              y2={plotH}
              stroke="var(--border-primary)"
            />
            <text
              x={plotW / 2}
              y={plotH + 30}
              textAnchor="middle"
              fontSize={10}
              fill="var(--text-tertiary)"
            >
              Churn (commits)
            </text>

            {/* X axis ticks */}
            {xScale.ticks(5).map((tick) => (
              <g
                key={`x-${tick}`}
                transform={`translate(${xScale(tick)},${plotH})`}
              >
                <line y2={4} stroke="var(--border-primary)" />
                <text
                  y={14}
                  textAnchor="middle"
                  fontSize={8}
                  fill="var(--text-tertiary)"
                >
                  {tick}
                </text>
              </g>
            ))}

            {/* Y axis */}
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={plotH}
              stroke="var(--border-primary)"
            />
            <text
              transform={`translate(-35,${plotH / 2}) rotate(-90)`}
              textAnchor="middle"
              fontSize={10}
              fill="var(--text-tertiary)"
            >
              Lines of Code
            </text>

            {/* Y axis ticks */}
            {yScale.ticks(5).map((tick) => (
              <g key={`y-${tick}`} transform={`translate(0,${yScale(tick)})`}>
                <line x2={-4} stroke="var(--border-primary)" />
                <text
                  x={-8}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={8}
                  fill="var(--text-tertiary)"
                >
                  {tick}
                </text>
              </g>
            ))}

            {/* Data points */}
            {points.map((p) => {
              const cx = xScale(p.churn);
              const cy = yScale(p.loc);
              const r = rScale(p.hotspotScore);
              const isSelected = selectedFile === p.file;

              return (
                <circle
                  key={p.file}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={categoryColor(p.category, 0.4)}
                  stroke={
                    isSelected
                      ? 'var(--accent-primary)'
                      : categoryColor(p.category, 0.7)
                  }
                  strokeWidth={isSelected ? 2.5 : 1}
                  onClick={() => onSelectFile(p.file)}
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        point: p,
                      });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  className="cursor-pointer"
                />
              );
            })}
          </g>
        </svg>
        {tooltip && (
          <div
            className="absolute bg-tooltip-bg border border-border-primary rounded px-2.5 py-1.5 text-[10px] text-tooltip-text pointer-events-none z-20 max-w-[250px] whitespace-nowrap"
            style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
          >
            <div className="font-semibold mb-0.5">{tooltip.point.file}</div>
            <div className="text-text-secondary">
              Churn: {tooltip.point.churn} commits · LOC: {tooltip.point.loc} ·
              Score: {tooltip.point.hotspotScore}
            </div>
          </div>
        )}
      </div>
      <HeroCaption
        primary="Churn × size · x = commits · y = lines of code · bubble size = hotspot score"
        subtitle="Top-right is the danger zone: large files that change constantly. Click any bubble to inspect the file."
      />
    </div>
  );
}
