import { Fragment } from 'react';
import SongItem from './SongItem';
import type { Song, SongVersion } from './types';

const SongList = ({songs, selectedVersionId, onVersionClick}: {
  songs: Song[];
  selectedVersionId?: string;
  onVersionClick: (version: SongVersion) => void;
}) => {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-x-4">
      {songs.map((song) => (
        <Fragment key={song.id}>
          <SongItem
            song={song}
            renderName={true}
          />
          <SongItem
            song={song}
            renderFiles={true}
            selectedVersionId={selectedVersionId}
            onVersionClick={onVersionClick}
          />
        </Fragment>
      ))}
    </div>
  );
};

export default SongList;

