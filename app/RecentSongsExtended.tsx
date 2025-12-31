'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { groupBy, map } from 'lodash';
import MyTooltip from '@/app/components/Tooltip';
import { formatRelativeTimestamp } from '@/lib/dateUtils';
import type { Song, SongVersion } from './songs/types';

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

const VersionRow = ({version}: {version: SongVersion}) => {
  return (
    <Link href={`/songs/${version.id}`} className="flex items-center gap-3 px-2 py-[2px] hover:bg-black/50">
      <span className="flex-1 font-mono min-w-0 w-[100px] text-gray-300" style={{fontSize: '12px'}}>
        <TruncatedFilename label={version.label} />
      </span>
      <MyTooltip content={<div>{formatDate(version.createdAt)}{version.createdBy && ` - ${version.createdBy}`}</div>} placement="left">
        <span className="text-gray-400 text-xs">{formatRelativeTimestamp(version.createdAt)}</span>
      </MyTooltip>
    </Link>
  );
};

const RecentSongs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/songs?limit=10')
      .then(res => res.json())
      .then(data => { setSongs(data.songs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (!songs.length) return <div className="text-gray-400 text-sm">No recent songs</div>;

  return (
    <div>
      {songs.map(song => {
        const tagsMinusSong = song.tags.filter(tag => tag !== 'song');
        // Group versions by label and get the most recent version for each label
        const versionsByLabel = groupBy(song.versions, 'label');
        const mostRecentVersions = map(versionsByLabel, versions => 
          versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        );
        return (
          <div key={song.id} className="flex">
            <div className="w-1/2 px-2 py-1 text-lg font-medium border-b border-gray-500 font-georgia">
              <Link href={`/songs/${mostRecentVersions[0]?.id || ''}`} className="text-white hover:text-gray-300">
                {song.title}
              </Link>
              {tagsMinusSong.length > 0 && (
                <span className="block text-[10px] text-gray-400 font-mono">{tagsMinusSong.join(', ')}</span>
              )}
            </div>
            <div className="border-b py-1 border-gray-500 w-1/2 flex flex-col justify-center">
              {mostRecentVersions.length === 0 ? (
                <p className="px-2 py-1 text-xs text-gray-500">No versions stored yet.</p>
              ) : (
                mostRecentVersions.map((version) => (
                  <VersionRow key={version.id} version={version} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RecentSongs;