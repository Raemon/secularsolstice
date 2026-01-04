'use client';
import SongItem from './songs/SongItem';
import Link from 'next/link';
import useSongsProgressiveLoad from './hooks/useSongsProgressiveLoad';
import type { Song } from './songs/types';

type RecentSongsProps = {
  initialSongs?: Song[];
};

const RecentSongs = ({ initialSongs }: RecentSongsProps = {}) => {
  const { songs: clientSongs, loading: clientLoading } = useSongsProgressiveLoad();
  const songs = initialSongs || clientSongs;
  const loading = initialSongs ? false : clientLoading;
  const recentSongs = songs.slice(0, 6);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (!recentSongs.length) return <div className="text-gray-400 text-sm">No recent songs</div>;

  return (
    <div>
      {recentSongs.map(song => (
        <SongItem key={song.id} song={song} showTags={false} maxVersions={1} sortReadmeFirst={false} />
      ))}
      <Link href="/songs" className="text-gray-500 p-2 text-sm text-right w-full block">View all</Link>
    </div>
  );
};

export default RecentSongs;