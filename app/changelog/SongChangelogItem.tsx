'use client';

import Link from 'next/link';
import { formatRelativeTimestamp } from '@/lib/dateUtils';
import { ChangelogVersion } from '@/app/hooks/useChangelogProgressiveLoad';
import Tooltip from '../components/Tooltip';

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

const SongChangelogItem = ({version, compact = false}: {version: ChangelogVersion; compact?: boolean}) => {
  const { added, removed } = calculateDiff(version.content, version.previousContent);
  const changedParts = getChangedText(version.content, version.previousContent);
  return (
    <div key={version.id} className={`flex items-center gap-2 ${compact ? 'py-0.5 text-xs' : 'py-1 text-sm gap-4'} font-mono min-w-0`}>
      <span className="w-6 shrink-0">{version.previousVersionId && <Link href={`/changelog/${version.previousVersionId}/${version.id}`} className="text-gray-400 hover:text-gray-200 text-xs">diff</Link>}</span>
      <span className={`${compact ? 'w-10' : 'w-16 shrink-0'} text-right`}>
        {added > 0 && <span className="text-green-500">+{added}</span>}
        {added > 0 && removed > 0 && <span className="text-gray-500">/</span>}
        {removed > 0 && <span className="text-red-500">-{removed}</span>}
        {added === 0 && removed === 0 && version.previousContent !== null && <span className="text-gray-500">±0</span>}
      </span>
      <Tooltip content={new Date(version.createdAt).toLocaleString()}>
        <span className={`text-gray-600 w-6 text-right shrink-0 text-[11px] ${compact ? 'hidden sm:inline' : ''}`}>
          {formatRelativeTimestamp(version.createdAt)}
        </span>
      </Tooltip>
      {version.createdBy 
        ? <Link href={`/users/${version.createdBy}`} className={`text-gray-500 hover:text-gray-300 text-nowrap w-[150px] flex-shrink-0 truncate ${compact ? 'hidden sm:inline-block' : ''}`}>
          {version.createdBy}
        </Link> 
        : <span className={`text-gray-500 ${compact ? 'hidden sm:inline' : ''}`}>
          anonymous
        </span>}
      <Link href={`/songs/${version.songId}/${version.id}`} className="text-gray-200 hover:underline truncate min-w-0">
        {compact ? version.label : `${version.songTitle} / ${version.label}`}
      </Link>
      {!compact && (changedParts.removed || changedParts.added) && <span className="truncate">{changedParts.removed && <span className="text-red-500">{changedParts.removed}</span>}{changedParts.added && <span className="text-green-500">{changedParts.added}</span>}</span>}
    </div>
  );
};

export default SongChangelogItem;
