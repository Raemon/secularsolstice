'use client';

import Link from 'next/link';
import { formatRelativeTimestamp } from '@/lib/dateUtils';
import { ProgramChangelogVersion } from '@/app/hooks/useProgramChangelogProgressiveLoad';
import Tooltip from '../components/Tooltip';

type SettingChange = { field: string; from: string; to: string };

const getSettingChanges = (version: ProgramChangelogVersion): SettingChange[] => {
  const changes: SettingChange[] = [];
  const isFirstVersion = version.previousTitle === null;
  if (isFirstVersion) {
    changes.push({ field: 'created', from: '', to: version.title || 'Untitled' });
    return changes;
  }
  if (version.title !== version.previousTitle) {
    changes.push({ field: 'title', from: version.previousTitle || '', to: version.title || '' });
  }
  if (version.elementCount !== version.previousElementCount) {
    const diff = version.elementCount - (version.previousElementCount ?? 0);
    changes.push({ field: 'elements', from: String(version.previousElementCount ?? 0), to: `${diff > 0 ? '+' : ''}${diff}` });
  }
  if (version.programCount !== version.previousProgramCount) {
    const diff = version.programCount - (version.previousProgramCount ?? 0);
    changes.push({ field: 'subprograms', from: String(version.previousProgramCount ?? 0), to: `${diff > 0 ? '+' : ''}${diff}` });
  }
  if ((version.videoUrl || '') !== (version.previousVideoUrl || '')) {
    changes.push({ field: 'video', from: version.previousVideoUrl ? 'set' : 'none', to: version.videoUrl ? 'set' : 'none' });
  }
  if ((version.printProgramForeword || '') !== (version.previousPrintProgramForeword || '')) {
    changes.push({ field: 'foreword', from: version.previousPrintProgramForeword ? 'set' : 'none', to: version.printProgramForeword ? 'set' : 'none' });
  }
  if ((version.printProgramEpitaph || '') !== (version.previousPrintProgramEpitaph || '')) {
    changes.push({ field: 'epitaph', from: version.previousPrintProgramEpitaph ? 'set' : 'none', to: version.printProgramEpitaph ? 'set' : 'none' });
  }
  if (version.isSubprogram !== version.previousIsSubprogram) {
    changes.push({ field: 'subprogram', from: String(version.previousIsSubprogram), to: String(version.isSubprogram) });
  }
  if (version.locked !== version.previousLocked) {
    changes.push({ field: 'locked', from: String(version.previousLocked), to: String(version.locked) });
  }
  if (version.archived !== version.previousArchived) {
    changes.push({ field: 'archived', from: String(version.previousArchived), to: String(version.archived) });
  }
  return changes;
};

const SettingChangeBadge = ({ change }: { change: SettingChange }) => {
  if (change.field === 'created') {
    return <span className="text-blue-400 text-[11px]">created</span>;
  }
  if (change.field === 'updated') {
    return <span className="text-gray-500 text-[11px]">updated</span>;
  }
  if (change.field === 'elements' || change.field === 'subprograms') {
    const isPositive = change.to.startsWith('+');
    return (
      <span className={`text-[11px] ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {change.field}: {change.to}
      </span>
    );
  }
  if (change.field === 'title') {
    return <span className="text-yellow-500 text-[11px]">title→{change.to.slice(0, 20)}</span>;
  }
  if (change.field === 'locked') {
    return <span className={`text-[11px] ${change.to === 'true' ? 'text-orange-400' : 'text-gray-400'}`}>{change.to === 'true' ? '🔒locked' : '🔓unlocked'}</span>;
  }
  if (change.field === 'archived') {
    return <span className={`text-[11px] ${change.to === 'true' ? 'text-red-400' : 'text-green-400'}`}>{change.to === 'true' ? 'archived' : 'unarchived'}</span>;
  }
  if (change.field === 'subprogram') {
    return <span className="text-purple-400 text-[11px]">{change.to === 'true' ? '→subprogram' : '→program'}</span>;
  }
  return <span className="text-gray-400 text-[11px]">{change.field}: {change.from}→{change.to}</span>;
};

const ProgramChangelogItem = ({version, compact = false, showType = false}: {version: ProgramChangelogVersion; compact?: boolean; showType?: boolean}) => {
  const changes = getSettingChanges(version);
  const isFirstVersion = version.previousTitle === null;
  // Show "updated" for versions with no detected field changes (e.g., element reordering)
  if (changes.length === 0 && !isFirstVersion) {
    changes.push({ field: 'updated', from: '', to: '' });
  }
  return (
    <div key={version.id} className={`flex items-center gap-2 ${compact ? 'py-0.5 text-xs' : 'py-1 text-sm gap-4'} font-mono min-w-0`}>
      <span className="w-6 shrink-0"></span>
      <span className="w-16 shrink-0"></span>
      <Tooltip content={new Date(version.createdAt).toLocaleString()}>
        <span className={`text-gray-600 w-8 text-right shrink-0 text-[11px] ${compact ? 'hidden sm:inline' : ''}`}>
          {formatRelativeTimestamp(version.createdAt)}
        </span>
      </Tooltip>
      {version.createdBy 
        ? <Link href={`/users/${version.createdBy}`} className={`text-gray-500 hover:text-gray-300 text-nowrap w-[120px] flex-shrink-0 truncate ${compact ? 'hidden sm:inline-block' : ''}`}>
          {version.createdBy}
        </Link> 
        : <span className={`text-gray-500 w-[120px] flex-shrink-0 ${compact ? 'hidden sm:inline' : ''}`}>
          anonymous
        </span>}
      {showType && <span className="text-purple-500 w-12 shrink-0 text-[11px]">program</span>}
      <Link href={`/programs/${version.programId}`} className="text-gray-200 hover:underline truncate min-w-0">
        {version.programTitle || 'Untitled'}
      </Link>
      <div className="flex gap-2 flex-wrap">
        {changes.slice(0, compact ? 2 : 4).map((change, i) => <SettingChangeBadge key={i} change={change} />)}
        {changes.length > (compact ? 2 : 4) && <span className="text-gray-500 text-[11px]">+{changes.length - (compact ? 2 : 4)} more</span>}
      </div>
    </div>
  );
};

export default ProgramChangelogItem;
