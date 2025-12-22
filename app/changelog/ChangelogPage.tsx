'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatRelativeTimestamp } from '@/lib/dateUtils';

type ChangelogVersion = {
  id: string;
  songId: string;
  songTitle: string;
  label: string;
  content: string | null;
  previousVersionId: string | null;
  previousContent: string | null;
  createdBy: string | null;
  createdAt: string;
};

const getChangedText = (current: string | null, previous: string | null): { added: string, removed: string } => {
  const currentStr = current || '';
  const previousStr = previous || '';
  if (currentStr === previousStr) return { added: '', removed: '' };
  if (!previousStr) return { added: currentStr.slice(0, 60), removed: '' };
  if (!currentStr) return { added: '', removed: previousStr.slice(0, 60) };
  // Find common prefix
  let prefixLen = 0;
  while (prefixLen < currentStr.length && prefixLen < previousStr.length && currentStr[prefixLen] === previousStr[prefixLen]) prefixLen++;
  // Find common suffix (don't overlap with prefix)
  let suffixLen = 0;
  while (suffixLen < currentStr.length - prefixLen && suffixLen < previousStr.length - prefixLen &&
         currentStr[currentStr.length - 1 - suffixLen] === previousStr[previousStr.length - 1 - suffixLen]) suffixLen++;
  return {
    added: currentStr.slice(prefixLen, currentStr.length - suffixLen).slice(0, 40),
    removed: previousStr.slice(prefixLen, previousStr.length - suffixLen).slice(0, 40)
  };
};

const calculateDiff = (content: string | null, previousContent: string | null) => {
  const currentLength = content?.length ?? 0;
  const previousLength = previousContent?.length ?? 0;
  if (previousContent === null) {
    return { added: currentLength, removed: 0 };
  }
  const diff = currentLength - previousLength;
  return { added: Math.max(0, diff), removed: Math.max(0, -diff) };
};

const ChangelogPage = ({songId, filename, compact = false}: {songId?: string; filename?: string; compact?: boolean} = {}) => {
  const [versions, setVersions] = useState<ChangelogVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChangelog = async () => {
      try {
        const params = new URLSearchParams();
        if (songId) params.set('songId', songId);
        if (filename) params.set('filename', filename);
        const url = params.toString() ? `/api/changelog?${params.toString()}` : '/api/changelog';
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch changelog');
        const data = await response.json();
        setVersions(data.versions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchChangelog();
  }, [songId, filename]);

  if (loading) return <div className={compact ? "text-gray-400 text-xs" : "p-4 text-gray-400"}>Loading changelog...</div>;
  if (error) return <div className={compact ? "text-red-500 text-xs" : "p-4 text-red-500"}>Error: {error}</div>;
  if (compact && versions.length === 0) return null;

  return (
    <div className={compact ? "overflow-hidden max-w-full" : "p-4 max-w-3xl mx-auto overflow-hidden"}>
      {!compact && <h1 className="text-xl font-mono mb-4 text-gray-200">Changelog</h1>}
      <div className="space-y-1 max-w-full overflow-x-auto">
        {versions.map((version) => {
          const { added, removed } = calculateDiff(version.content, version.previousContent);
          const changedParts = getChangedText(version.content, version.previousContent);
          return (
            <div key={version.id} className={`flex items-center gap-2 ${compact ? 'py-0.5 text-xs' : 'py-1 text-sm gap-4'} font-mono min-w-0`}>
              <span className={`${compact ? 'w-10' : 'w-16 shrink-0'} text-right`}>
                {added > 0 && <span className="text-green-500">+{added}</span>}
                {added > 0 && removed > 0 && <span className="text-gray-500">/</span>}
                {removed > 0 && <span className="text-red-500">-{removed}</span>}
                {added === 0 && removed === 0 && version.previousContent !== null && <span className="text-gray-500">±0</span>}
              </span>
              <span className={`text-gray-600 w-6 text-right shrink-0 text-[11px] ${compact ? 'hidden sm:inline' : ''}`}>{formatRelativeTimestamp(version.createdAt)}</span>
              <span className={`text-gray-500 ${compact ? 'hidden sm:inline' : ''}`}>{version.createdBy || 'anonymous'}</span>
              <Link href={`/songs/${version.id}`} className="text-gray-200 hover:underline truncate min-w-0">
                {compact ? version.label : `${version.songTitle} / ${version.label}`}
              </Link>
              {!compact && (changedParts.removed || changedParts.added) && <span className="truncate">{changedParts.removed && <span className="text-red-500">{changedParts.removed}</span>}{changedParts.added && <span className="text-green-500">{changedParts.added}</span>}</span>}
              {version.previousVersionId && <Link href={`/changelog/${version.previousVersionId}/${version.id}`} className={`text-gray-400 hover:text-gray-200 text-xs shrink-0 ${compact ? 'hidden sm:inline' : ''}`}>diff</Link>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChangelogPage;
