import { useState } from 'react';

import Badge from '../shared/Badge';
import { type Column, SortableTable } from '../shared/SortableTable';
import { Tooltip } from '../shared/Tooltip';
import { fileName, filePath, fmt } from '../theme';
import type { CursedFile, GitrelicReport } from '@gitrelic/core';

interface CursedFilesTabProps {
  report: GitrelicReport;
  onSelectFile: (file: string) => void;
}

function reasonVariant(
  reason: string,
): 'critical' | 'warning' | 'ownership' | 'coupling' | 'parallel' {
  if (
    reason.includes('revert') ||
    reason.includes('shame') ||
    reason.includes('break')
  )
    return 'critical';
  if (reason.includes('author') || reason.includes('owner')) return 'ownership';
  if (reason.includes('coupling') || reason.includes('coordination'))
    return 'coupling';
  if (reason.includes('parallel')) return 'parallel';
  return 'warning';
}

function getAuthors(
  file: string,
  report: GitrelicReport,
): string[] | undefined {
  const bf = report.busFactors.files.find((f) => f.file === file);
  return bf ? bf.authors : undefined;
}

export function CursedFilesTab({ report, onSelectFile }: CursedFilesTabProps) {
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  const columns: Column<CursedFile>[] = [
    {
      key: 'file',
      label: 'File',
      render: (c) => (
        <span className="font-mono text-[11px] text-severity-critical">
          {fileName(c.file)}
          <span className="text-text-tertiary ml-1.5 text-[10px]">
            {filePath(c.file)}
          </span>
        </span>
      ),
    },
    {
      key: 'reasons',
      label: 'Reasons',
      width: '300px',
      render: (c) => (
        <div className="flex gap-1 flex-wrap">
          {c.reasons.slice(0, 4).map((r) => (
            <Badge key={r} variant={reasonVariant(r)}>
              {r}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'score',
      label: 'Curse Score',
      width: '80px',
      align: 'right',
      sortValue: (c) => c.curseScore,
      render: (c) => (
        <span className="font-mono text-[11px] text-severity-critical font-semibold">
          {c.curseScore}
        </span>
      ),
    },
    {
      key: 'churn',
      label: 'Churn',
      width: '60px',
      align: 'right',
      sortValue: (c) => c.churn,
      render: (c) => (
        <span className="font-mono text-[11px] text-text-secondary">
          {fmt(c.churn)}
        </span>
      ),
    },
    {
      key: 'authors',
      label: 'Authors',
      width: '60px',
      align: 'right',
      sortValue: (c) => c.authors,
      render: (c) => {
        const authors = getAuthors(c.file, report);
        const span = (
          <span className="font-mono text-[11px] text-text-secondary">
            {c.authors}
          </span>
        );
        if (!authors) return span;
        return (
          <Tooltip
            content={
              <div className="flex flex-col gap-0.5">
                {authors.map((a) => (
                  <span key={a}>{a.split('@')[0]}</span>
                ))}
              </div>
            }
          >
            {span}
          </Tooltip>
        );
      },
    },
  ];

  const { files, excludedBotFiles } = report.cursedFiles;

  // Rendered in both branches: a repo can have surviving cursed files *and*
  // withheld ones, and hiding the list in that case defeats the point of
  // withholding transparently rather than silently dropping.
  const withheld = excludedBotFiles.length > 0 && (
    <div className="flex flex-col gap-1 px-4 py-2">
      <span className="text-text-tertiary text-[11px]">
        {excludedBotFiles.length} file
        {excludedBotFiles.length === 1 ? '' : 's'} withheld as machine-generated
        churn:
      </span>
      <div className="flex flex-wrap gap-1">
        {excludedBotFiles.map((f) => (
          <Badge key={f} variant="stale">
            {fileName(f)}
          </Badge>
        ))}
      </div>
    </div>
  );

  if (files.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-severity-healthy px-4 pt-4 text-xs font-semibold">
          No cursed files found.
        </span>
        {withheld}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {withheld}
      <SortableTable
        data={files}
        columns={columns}
        rowKey={(c) => c.file}
        onRowClick={(c) => onSelectFile(c.file)}
        expandedKey={expandedFile}
        onRowExpand={setExpandedFile}
        // The analyzer has always produced a per-file narrative; nothing rendered
        // it until now. Same expand affordance as HotspotsTab.
        renderExpanded={(c) => (
          <span className="text-text-secondary text-[11px] leading-relaxed">
            {c.narrative}
          </span>
        )}
      />
    </div>
  );
}
