'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type VersionData = {
  id: string;
  songId: string;
  label: string;
  content: string | null;
  songTitle?: string;
  createdAt: string;
  createdBy: string | null;
};

type DiffLine = {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
};

export const computeLineDiff = (oldText: string, newText: string): { oldLines: DiffLine[]; newLines: DiffLine[] } => {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  const oldResult: DiffLine[] = [];
  const newResult: DiffLine[] = [];
  let i = m, j = n;
  const oldTemp: DiffLine[] = [];
  const newTemp: DiffLine[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      oldTemp.push({ type: 'unchanged', content: oldLines[i - 1] });
      newTemp.push({ type: 'unchanged', content: newLines[j - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      oldTemp.push({ type: 'unchanged', content: '' });
      newTemp.push({ type: 'added', content: newLines[j - 1] });
      j--;
    } else {
      oldTemp.push({ type: 'removed', content: oldLines[i - 1] });
      newTemp.push({ type: 'unchanged', content: '' });
      i--;
    }
  }
  oldTemp.reverse().forEach(line => oldResult.push(line));
  newTemp.reverse().forEach(line => newResult.push(line));
  return { oldLines: oldResult, newLines: newResult };
};

type VersionDiffProps = {
  oldVersionId?: string;
  newVersionId?: string;
  oldText?: string;
  newText?: string;
  oldLabel?: string;
  newLabel?: string;
  title?: string;
  showBackLink?: boolean;
};

const VersionDiffPage = ({ oldVersionId, newVersionId, oldText, newText, oldLabel, newLabel, title, showBackLink = true }: VersionDiffProps) => {
  const [oldVersion, setOldVersion] = useState<VersionData | null>(null);
  const [newVersion, setNewVersion] = useState<VersionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const useTextMode = oldText !== undefined || newText !== undefined;

  useEffect(() => {
    if (useTextMode) {
      setLoading(false);
      return;
    }
    if (!oldVersionId || !newVersionId) {
      setError('Version IDs required');
      setLoading(false);
      return;
    }
    const fetchVersions = async () => {
      try {
        const [oldRes, newRes] = await Promise.all([
          fetch(`/api/songs/versions/${oldVersionId}?includeContent=true`),
          fetch(`/api/songs/versions/${newVersionId}?includeContent=true`)
        ]);
        if (!oldRes.ok) throw new Error('Failed to fetch old version');
        if (!newRes.ok) throw new Error('Failed to fetch new version');
        const oldData = await oldRes.json();
        const newData = await newRes.json();
        setOldVersion(oldData.version);
        setNewVersion(newData.version);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [oldVersionId, newVersionId, useTextMode]);

  if (loading) return <div className="p-4 text-gray-400">Loading versions...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!useTextMode && (!oldVersion || !newVersion)) return <div className="p-4 text-gray-400">Version not found</div>;

  const oldContent = useTextMode ? (oldText || '') : (oldVersion?.content || '');
  const newContent = useTextMode ? (newText || '') : (newVersion?.content || '');
  const displayOldLabel = oldLabel || oldVersion?.label || 'Old';
  const displayNewLabel = newLabel || newVersion?.label || 'New';
  const displayTitle = title || oldVersion?.songTitle || newVersion?.songTitle || '';
  const { oldLines, newLines } = computeLineDiff(oldContent, newContent);

  return (
    <div className="p-4">
      {showBackLink && <Link href="/changelog" className="text-gray-400 hover:text-gray-200 text-sm mb-4 inline-block">← Back to changelog</Link>}
      {displayTitle && <h1 className="text-xl font-mono mb-2 text-gray-200">{displayTitle}</h1>}
      <div className="flex gap-4 mb-4 text-sm text-gray-400 font-mono">
        <span>Comparing: <span className="text-red-400">{displayOldLabel}</span> → <span className="text-green-400">{displayNewLabel}</span></span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 overflow-auto">
          <div className="text-sm font-mono text-gray-400 mb-1">Old ({displayOldLabel})</div>
          <div className="bg-gray-900 p-2 font-mono text-sm whitespace-pre-wrap">
            {oldLines.map((line, idx) => (
              <div key={idx} className={`${line.type === 'removed' ? 'bg-red-900/40 text-red-300' : line.content === '' && line.type === 'unchanged' ? 'h-5' : 'text-gray-300'}`}>
                {line.content || (line.type === 'unchanged' ? '\u00A0' : '')}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="text-sm font-mono text-gray-400 mb-1">New ({displayNewLabel})</div>
          <div className="bg-gray-900 p-2 font-mono text-sm whitespace-pre-wrap">
            {newLines.map((line, idx) => (
              <div key={idx} className={`${line.type === 'added' ? 'bg-green-900/40 text-green-300' : line.content === '' && line.type === 'unchanged' ? 'h-5' : 'text-gray-300'}`}>
                {line.content || (line.type === 'unchanged' ? '\u00A0' : '')}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionDiffPage;
