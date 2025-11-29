'use client';

import type { Song, SongVersion } from './types';
import MyTooltip from '@/app/components/Tooltip';
import { useUser } from '../contexts/UserContext';


const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const formatRelativeTimestamp = (dateStr: string) => {
  const date = new Date(dateStr).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - date);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const monthMs = 30 * dayMs;
  const minutes = Math.round(diffMs / minuteMs);
  if (diffMs < hourMs) {
    return `${Math.max(1, minutes)}m`;
  }
  const hours = Math.round(diffMs / hourMs);
  if (diffMs < dayMs) {
    return `${Math.max(1, hours)}h`;
  }
  const days = Math.round(diffMs / dayMs);
  if (diffMs < monthMs) {
    return `${Math.max(1, days)}d`;
  }
  const months = Math.round(diffMs / monthMs);
  if (months < 12) {
    return `${Math.max(1, months)}mo`;
  }
  return new Date(dateStr).getFullYear().toString();
};

const VersionRow = ({version, isSelected, onClick}: {
  version: SongVersion;
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-2 py-1 cursor-pointer ${isSelected ? 'bg-primary' : 'hover:bg-black/50'}`}
    >
      <span className={`flex-1 font-mono min-w-0 w-[100px] truncate ${isSelected ? 'font-medium' : ''}`} style={{fontSize: '12px'}}>
        <span className={`${isSelected ? 'text-primary' : 'text-gray-300'}`}>{version.label}</span>
      </span>
      <MyTooltip content={<div>{formatDate(version.createdAt)}{version.createdBy && ` - ${version.createdBy}`}</div>} placement="left">
        <span className="text-gray-400 text-xs">{formatRelativeTimestamp(version.createdAt)}</span>
      </MyTooltip>
    </div>
  );
};

const SongItem = ({song, selectedVersionId, onVersionClick, onCreateNewVersion}: {
  song: Song;
  selectedVersionId?: string;
  onVersionClick: (version: SongVersion) => void;
  onCreateNewVersion: (song: Song) => void;
}) => {
  const { canEdit } = useUser();

  return (
    <div className="flex">
      <div className="group flex items-center w-2/3 justify-between px-2 py-1 text-base font-medium border-b border-gray-200 font-georgia">
        <span>{song.title.replace(/_/g, ' ')}</span>
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onCreateNewVersion(song); }}
            className="opacity-0 bg-gray-800 rounded-full p-1 group-hover:opacity-100 text-gray-400 hover:text-blue-400 text-sm"
            title="Add new version"
          >
            +
          </button>
        )}
      </div>
      <div className="border-b border-gray-200 w-1/3">
        {song.versions.length === 0 ? (
          <p className="px-2 py-1 text-xs text-gray-500">No versions stored yet.</p>
        ) : (
          song.versions.map((version) => (
            <VersionRow
              key={version.id}
              version={version}
              isSelected={selectedVersionId === version.id}
              onClick={() => onVersionClick(version)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default SongItem;
