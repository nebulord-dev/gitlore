import Badge from '../shared/Badge';
import { fileName, fmt, severityColor } from '../theme';
import type { GitrelicReport } from '@gitrelic/core';

interface FileInspectorProps {
  report: GitrelicReport;
  file: string;
  onSelectContributor: (email: string) => void;
}

interface InspectorRow {
  label: string;
  value: string;
  color?: string;
}

function getFileData(file: string, report: GitrelicReport): InspectorRow[] {
  const rows: InspectorRow[] = [];

  const hotspot = report.hotspots.topHotspots.find((h) => h.file === file);
  if (hotspot) {
    rows.push({
      label: 'Hotspot Score',
      value: String(hotspot.hotspotScore),
      color: `var(--severity-${severityColor(hotspot.category)})`,
    });
  }

  const churn = report.churn.files.find((f) => f.file === file);
  if (churn) {
    rows.push({ label: 'Churn (commits)', value: fmt(churn.commitCount) });
  }

  const loc = report.loc.files.find((f) => f.file === file);
  if (loc) {
    rows.push({ label: 'Lines of Code', value: fmt(loc.lines) });
    rows.push({ label: 'Language', value: loc.language });
  }

  const bf = report.busFactors.files.find((f) => f.file === file);
  if (bf) {
    rows.push({
      label: 'Bus Factor',
      value: `${bf.uniqueAuthors} (${bf.dominantAuthor.split('@')[0]}: ${bf.dominantAuthorPercent}%)`,
      color: bf.risk === 'critical' ? 'var(--severity-critical)' : undefined,
    });
  }

  const age = report.ageMap.files.find((f) => f.file === file);
  if (age) {
    rows.push({ label: 'Age', value: `${age.ageInDays} days (${age.status})` });
  }

  const blast = report.blastRadius.files.find((f) => f.file === file);
  if (blast) {
    rows.push({
      label: 'Blast Radius',
      value: `${blast.avgCoChangedFiles.toFixed(1)} avg files`,
      color: blast.blastScore > 50 ? 'var(--severity-warning)' : undefined,
    });
  }

  const cp = report.coupling.fileProfiles.find((f) => f.file === file);
  if (cp && cp.topPartner) {
    rows.push({
      label: 'Coupled With',
      value: `${fileName(cp.topPartner)} (${Math.round(cp.couplingScore)}%)`,
    });
  }

  const cursed = report.cursedFiles.files.find((f) => f.file === file);
  if (cursed) {
    rows.push({
      label: 'Curse Score',
      value: String(cursed.curseScore),
      color: 'var(--severity-critical)',
    });
  }

  const rr = report.rewriteRatio.files.find((f) => f.file === file);
  if (rr) {
    rows.push({ label: 'Rewrite Ratio', value: rr.ratio.toFixed(2) });
  }

  const sh = report.forensics.files.find((f) => f.file === file);
  if (sh && sh.shameScore > 0) {
    rows.push({
      label: 'Shame Score',
      value: String(sh.shameScore),
      color: 'var(--severity-warning)',
    });
  }

  const cv = report.churnVelocity.files.find((f) => f.file === file);
  if (cv) {
    rows.push({ label: 'Churn Trend', value: cv.trend });
  }

  const rename = report.renameTracking.chains.find(
    (c) => c.currentPath === file,
  );
  if (rename && rename.renameCount > 0) {
    rows.push({ label: 'Renames', value: `${rename.renameCount} times` });
  }

  return rows;
}

export function FileInspector({
  report,
  file,
  onSelectContributor,
}: FileInspectorProps) {
  const rows = getFileData(file, report);
  const hotspot = report.hotspots.topHotspots.find((h) => h.file === file);
  const bf = report.busFactors.files.find((f) => f.file === file);

  return (
    <div>
      {/* Header */}
      <div className="text-[11px] font-semibold text-text-primary mb-2 break-all font-mono">
        {file}
      </div>

      {hotspot && (
        <div className="mb-3">
          <Badge variant={severityColor(hotspot.category)}>
            {hotspot.category} hotspot
          </Badge>
        </div>
      )}

      {/* Signal rows */}
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex justify-between py-1.5 border-b border-border-primary text-[10px]"
        >
          <span className="text-text-tertiary">{row.label}</span>
          {/* color is a runtime CSS var token — kept as inline style */}
          <span
            className="font-medium"
            style={{ color: row.color ?? 'var(--text-primary)' }}
          >
            {row.value}
          </span>
        </div>
      ))}

      {/* Top contributors for this file */}
      {bf && bf.authors.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] text-text-tertiary mb-2">
            Top Contributors
          </div>
          {bf.authors.slice(0, 5).map((email) => {
            const contributor = report.contributors.contributors.find(
              (c) => c.email === email,
            );
            return (
              <div
                key={email}
                onClick={() => onSelectContributor(email)}
                className="flex items-center gap-2 py-1.5 border-b border-border-primary cursor-pointer"
              >
                <div className="w-[22px] h-[22px] rounded-full bg-surface-tertiary flex items-center justify-center text-[9px] text-text-secondary shrink-0">
                  {(contributor?.name ?? email).slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-text-primary">
                    {contributor?.name ?? email.split('@')[0]}
                  </div>
                </div>
                <span className="text-[10px] text-text-secondary">
                  {email === bf.dominantAuthor
                    ? `${bf.dominantAuthorPercent}%`
                    : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
