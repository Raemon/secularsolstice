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
  let prefixLen = 0;
  while (prefixLen < currentStr.length && prefixLen < previousStr.length && currentStr[prefixLen] === previousStr[prefixLen]) prefixLen++;
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

const UserChangelog = ({username}: {username: string}) => {
  const [versions, setVersions] = useState<ChangelogVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChangelog = async () => {
      try {
        const response = await fetch(`/api/changelog?username=${encodeURIComponent(username)}`);
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
  }, [username]);

  if (loading) return <div className="p-4 text-gray-400">Loading changelog...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto overflow-hidden">
      <h1 className="text-xl font-mono mb-4 text-gray-200">{username}&apos;s Changes</h1>
      {versions.length === 0 ? (
        <div className="text-gray-500">No changes found for this user.</div>
      ) : (
        <div className="space-y-1 max-w-full overflow-x-auto">
          {versions.map((version) => {
            const { added, removed } = calculateDiff(version.content, version.previousContent);
            const changedParts = getChangedText(version.content, version.previousContent);
            return (
              <div key={version.id} className="flex items-center gap-4 py-1 text-sm font-mono min-w-0">
                <span className="w-16 shrink-0 text-right">
                  {added > 0 && <span className="text-green-500">+{added}</span>}
                  {added > 0 && removed > 0 && <span className="text-gray-500">/</span>}
                  {removed > 0 && <span className="text-red-500">-{removed}</span>}
                  {added === 0 && removed === 0 && version.previousContent !== null && <span className="text-gray-500">±0</span>}
                </span>
                <span className="text-gray-600 w-6 text-right shrink-0 text-[11px]">{formatRelativeTimestamp(version.createdAt)}</span>
                <Link href={`/songs/${version.id}`} className="text-gray-200 hover:underline truncate min-w-0">
                  {version.songTitle} / {version.label}
                </Link>
                {(changedParts.removed || changedParts.added) && <span className="truncate">{changedParts.removed && <span className="text-red-500">{changedParts.removed}</span>}{changedParts.added && <span className="text-green-500">{changedParts.added}</span>}</span>}
                {version.previousVersionId && <Link href={`/changelog/${version.previousVersionId}/${version.id}`} className="text-gray-400 hover:text-gray-200 text-xs shrink-0">diff</Link>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserChangelog;
