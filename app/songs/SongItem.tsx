'use client';

import type { Song, SongVersion } from './types';
import MyTooltip from '@/app/components/Tooltip';
import { useUser } from '../contexts/UserContext';
import { formatRelativeTimestamp } from '@/lib/dateUtils';
import { groupBy, map } from 'lodash';


const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const VersionRow = ({version, isSelected, onClick}: {
  version: SongVersion;
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-2 py-1 cursor-pointer ${isSelected ? 'text-primary' : 'hover:bg-black/50'}`}
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

const SongItem = ({song, selectedVersionId, selectedSongId, onSongClick, onVersionClick, onCreateNewVersion}: {
  song: Song;
  selectedVersionId?: string;
  selectedSongId?: string;
  onSongClick: (song: Song) => void;
  onVersionClick: (version: SongVersion) => void;
  onCreateNewVersion: (song: Song) => void;
}) => {
  const { canEdit } = useUser();

  const tagsMinusSong = song.tags.filter(tag => tag !== 'song');

  // Group versions by label and get the most recent version for each label
  const versionsByLabel = groupBy(song.versions, 'label');
  const mostRecentVersions = map(versionsByLabel, versions => 
    versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  );

  const isSongSelected = selectedSongId === song.id && !selectedVersionId;

  return (
    <div className="flex">
      <div className="group flex items-center w-2/3 justify-between px-2 py-1 text-lg font-medium border-b border-gray-500 font-georgia">
        <div className="flex flex-col cursor-pointer" onClick={() => onSongClick(song)}>
          <span className={isSongSelected ? 'text-primary' : 'hover:text-gray-300'}>
            {song.title}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">{tagsMinusSong.join(', ')}</span>
          </div>
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onCreateNewVersion(song); }}
            className="opacity-0 bg-gray-800 font-bold rounded-lg p-1 group-hover:opacity-100 text-white hover:bg-gray-700 px-2 text-sm"
            title="Add new version"
          >
            +
          </button>
        )}
      </div>
      <div className="border-b border-gray-500 w-1/3">
        {mostRecentVersions.length === 0 ? (
          <p className="px-2 py-1 text-xs text-gray-500">No versions stored yet.</p>
        ) : (
          mostRecentVersions.map((version) => (
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
