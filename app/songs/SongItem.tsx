'use client';

import Link from 'next/link';
import type { Song, SongVersion } from './types';
import MyTooltip from '@/app/components/Tooltip';
import { formatRelativeTimestamp } from '@/lib/dateUtils';
import { groupBy, map } from 'lodash';

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const TruncatedFilename = ({label, className}: {label: string; className?: string}) => {
  const lastDot = label.lastIndexOf('.');
  if (lastDot === -1) return <span className={`truncate ${className}`}>{label}</span>;
  const name = label.slice(0, lastDot);
  const ext = label.slice(lastDot);
  const tailChars = 5;
  const nameTail = name.slice(-tailChars);
  const nameHead = name.slice(0, -tailChars);
  return (
    <span className={`flex min-w-0 ${className}`}>
      <span className="truncate">{nameHead}</span>
      <span className="flex-shrink-0">{nameTail}{ext}</span>
    </span>
  );
};

const VersionRow = ({version, songId, isSelected}: {version: SongVersion; songId: string; isSelected: boolean}) => {
  return (
    <Link 
      href={`/songs/${songId}/${version.id}`}
      data-version-id={version.id}
      className={`flex items-center gap-3 px-2 py-[2px] ${isSelected ? 'text-primary' : 'hover:bg-white/10'}`}
    >
      <span className={`flex-1 font-mono min-w-0 w-[100px] ${isSelected ? 'font-medium' : ''}`} style={{fontSize: '12px'}}>
        <TruncatedFilename label={version.label} className={isSelected ? 'text-primary' : 'text-gray-400'} />
      </span>
      <MyTooltip content={<div>{formatDate(version.createdAt)}{version.createdBy && ` - ${version.createdBy}`}</div>} placement="left">
        <span className="text-gray-600 text-xs">{formatRelativeTimestamp(version.createdAt)}</span>
      </MyTooltip>
    </Link>
  );
};

const SongItem = ({song, selectedSongId, selectedVersionId, showTags = true, maxVersions}: {
  song: Song;
  selectedSongId?: string;
  selectedVersionId?: string;
  showTags?: boolean;
  maxVersions?: number;
}) => {
  const tagsMinusSong = song.tags.filter(tag => tag !== 'song');
  const isSongSelected = selectedSongId === song.id && !selectedVersionId;

  // Group versions by label and get the most recent version for each label
  const versionsByLabel = groupBy(song.versions, 'label');
  const mostRecentVersions = map(versionsByLabel, versions => 
    versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  );

  return (
    <div className="flex bg-black/30" data-song-id={song.id}>
      <div className="group flex items-center w-1/2 justify-between pl-3 pr-2 py-1 text-lg font-medium border-b border-gray-800 font-georgia">
        <Link href={`/songs/${song.id}`} className="flex flex-col">
          <span className={isSongSelected ? 'text-primary' : 'hover:text-gray-300'}>
            {song.title}
          </span>
          {showTags && <span className="text-[10px] text-gray-400 font-mono">{tagsMinusSong.join(', ')}</span>}
        </Link>
      </div>
      <div className="border-b py-1 border-gray-800 w-1/2 flex flex-col justify-center pr-2">
        {mostRecentVersions.length === 0 ? (
          <p className="px-2 py-1 text-xs text-gray-500">No versions stored yet.</p>
        ) : (
          (maxVersions ? mostRecentVersions.slice(0, maxVersions) : mostRecentVersions).map((version) => (
            <VersionRow
              key={version.id}
              version={version}
              songId={song.id}
              isSelected={selectedVersionId === version.id}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default SongItem;