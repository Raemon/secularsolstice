'use client';
import { useEffect, useState } from 'react';
import type { Song } from './songs/types';
import SongItem from './songs/SongItem';

const RecentSongs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/songs?limit=6')
      .then(res => res.json())
      .then(data => { setSongs(data.songs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (!songs.length) return <div className="text-gray-400 text-sm">No recent songs</div>;

  return (
    <div>
      {songs.map(song => (
        <SongItem key={song.id} song={song} showTags={false} maxVersions={3} />
      ))}
    </div>
  );
};

export default RecentSongs;