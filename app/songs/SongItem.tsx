'use client';

import type { Song, SongVersion } from './types';

const VersionRow = ({version, isSelected, onClick}: {
  version: SongVersion;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const isReadme = version.label.includes('README.md');
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-2 py-1 cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
    >
      <span className={`flex-1 font-mono min-w-0 ${isSelected ? 'font-medium' : ''}`} style={isReadme ? {fontSize: '12px', opacity: 0.7} : {fontSize: '12px'}}>
        <span className="text-gray-800">{version.label}</span>
      </span>
    </div>
  );
};

const SongItem = ({song, selectedVersionId, onVersionClick, onCreateNewVersion}: {
  song: Song;
  selectedVersionId?: string;
  onVersionClick: (version: SongVersion) => void;
  onCreateNewVersion: (song: Song) => void;
}) => {
  return (
    <div className="flex">
      <div className="group flex items-center w-2/3 justify-between px-2 py-1 text-base font-medium border-b border-gray-200 font-georgia">
        <span>{song.title.replace(/_/g, ' ')}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onCreateNewVersion(song); }}
          className="opacity-0 bg-gray-200 rounded-full p-1 group-hover:opacity-100 text-gray-400 hover:text-blue-600 text-sm"
          title="Add new version"
        >
          +
        </button>
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
