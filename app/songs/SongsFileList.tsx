'use client';

import maxBy from 'lodash/maxBy';
import { useState, useEffect, useRef, useCallback } from 'react';
import SearchInput from './SearchInput';
import SongItem from './SongItem';
import VersionDetailPanel from './VersionDetailPanel';
import CreateVersionForm from './CreateVersionForm';
import type { Song, SongVersion } from './types';
import { useUser } from '../contexts/UserContext';
import useVersionPanelManager from '../hooks/useVersionPanelManager';
import CreateSongButton from '../components/CreateSongButton';
import DownloadAllSongsButton from './DownloadAllSongsButton';

const getLatestVersion = (versions: SongVersion[]) => maxBy(versions, (version) => new Date(version.createdAt).getTime());

type SongsFileListProps = {
  initialVersionId?: string;
};

const SongsFileList = ({ initialVersionId }: SongsFileListProps = {}) => {
  console.log('SongsFileList component rendering');
  const { userName } = useUser();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [creatingVersionForSong, setCreatingVersionForSong] = useState<Song | null>(null);
  const [sortOption, setSortOption] = useState<'alphabetical' | 'recently-updated'>('recently-updated');
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const fetchSongs = useCallback(async () => {
    console.log('fetchSongs called');
    try {
      setLoading(true);
      console.log('About to fetch from /api/songs');
      const response = await fetch('/api/songs');
      console.log('Got response:', response.status, response.statusText);
      if (!response.ok) {
        console.error('Response not OK:', response.status);
        throw new Error(`Failed to fetch songs: ${response.status}`);
      }
      console.log('Response OK, parsing JSON');
      const data = await response.json();
      console.log('Parsed data:', data);
      setSongs(data.songs);
      setListError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setListError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  console.log('songs', songs);
  const filteredSongs = songs.filter(song => {
    const searchLower = searchTerm.toLowerCase();
    if (song.title.toLowerCase().includes(searchLower)) {
      return true;
    }
    return song.versions.some(version =>
      version.label.toLowerCase().includes(searchLower) ||
      (version.content && version.content.toLowerCase().includes(searchLower))
    );
  }).sort((a, b) => {
    if (sortOption === 'alphabetical') {
      return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
    } else if (sortOption === 'recently-updated') {
      // Find the most recent version for each song
      // Handle songs with no versions
      if (a.versions.length === 0 && b.versions.length === 0) return 0;
      if (a.versions.length === 0) return 1; // a comes after b
      if (b.versions.length === 0) return -1; // b comes after a
      
      const aLatestVersion = getLatestVersion(a.versions);
      const bLatestVersion = getLatestVersion(b.versions);
      if (!aLatestVersion || !bLatestVersion) {
        return 0;
      }
      return new Date(bLatestVersion.createdAt).getTime() - new Date(aLatestVersion.createdAt).getTime();
    }
    return 0;
  });


  const getBasePath = useCallback(() => '/songs', []);
  const resolveSongContext = useCallback(
    (selectedVersion: SongVersion | null) => {
      if (creatingVersionForSong) {
        return { songId: creatingVersionForSong.id, previousVersionId: null };
      }

      if (!selectedVersion) {
        return { songId: null, previousVersionId: null };
      }

      const selectedSongFromList = songs.find((song) => song.versions.some((version) => version.id === selectedVersion.id));
      const inferredSongId =
        (selectedVersion as SongVersion & { songId?: string }).songId || selectedSongFromList?.id || null;

      return {
        songId: inferredSongId,
        previousVersionId: selectedVersion.id,
      };
    },
    [creatingVersionForSong, songs],
  );
  const {
    selectedVersion,
    previousVersions,
    isExpandedPreviousVersions,
    isCreatingVersion,
    newVersionForm,
    togglePreviousVersions,
    startEditingVersion,
    clearSelection,
    handleVersionClick,
    handleClosePanel,
    handleCreateVersionClick,
    handleCancelCreateVersion: cancelVersionCreation,
    handleFormChange,
    handleSubmitVersion,
    handleArchiveVersion,
    panelError,
    isSubmitting,
    isArchiving,
    resetPanelError,
  } = useVersionPanelManager({
    userName,
    getBasePath,
    resolveSongContext,
    onVersionCreated: async () => {
      await fetchSongs();
      setCreatingVersionForSong(null);
    },
    onVersionArchived: fetchSongs,
  });
  const handleSongVersionClick = useCallback(
    (version: SongVersion, options?: { skipUrlUpdate?: boolean }) =>
      handleVersionClick(version.id, { initialVersion: version, skipUrlUpdate: options?.skipUrlUpdate }),
    [handleVersionClick],
  );

  useEffect(() => {
    if (!initialVersionId) {
      return;
    }
    if (!songs.length) {
      return;
    }
    if (selectedVersion?.id === initialVersionId) {
      return;
    }
    const targetSong = songs.find(song =>
      song.versions.some(version => version.id === initialVersionId)
    );
    if (!targetSong) {
      return;
    }
    const targetVersion = targetSong.versions.find(version => version.id === initialVersionId);
    if (!targetVersion) {
      return;
    }
    handleSongVersionClick(targetVersion, { skipUrlUpdate: true });
  }, [handleSongVersionClick, initialVersionId, selectedVersion?.id, songs]);

  const handleCreateNewVersionForSong = (song: Song) => {
    setCreatingVersionForSong(song);
    clearSelection();
    resetPanelError();
    startEditingVersion();
  };

  const handleCancelNewVersionForSong = () => {
    setCreatingVersionForSong(null);
    cancelVersionCreation();
  };

  const handleCollapsedSongClick = async (song: Song) => {
    setIsListCollapsed(false);
    const latestVersion = getLatestVersion(song.versions);
    if (latestVersion) {
      await handleSongVersionClick(latestVersion);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        if (creatingVersionForSong) {
          handleCancelNewVersionForSong();
        } else if (selectedVersion) {
          handleClosePanel();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [creatingVersionForSong, selectedVersion, handleClosePanel, handleCancelNewVersionForSong]);

  if (loading) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-400">Loading songs...</p>
        </div>
      </div>
    );
  }

  if (listError) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-red-600">Error: {listError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 relative">
      <div className="flex gap-4  justify-center">
        {isListCollapsed ? (
          <div className={`w-[70px] flex flex-col items-center gap-2 ${isCreatingVersion ? 'opacity-50 pointer-events-none' : ''}`}>
            <button
              onClick={() => setIsListCollapsed(false)}
              className="text-xs px-2 py-1 text-gray-400 whitespace-nowrap"
            >
              Show
            </button>
            <div className="flex-1 w-full overflow-y-auto space-y-1">
              {filteredSongs.map((song) => {
                const abbreviation = song.title.replace(/The/g, ' ').replace(/An/g, ' ').replace(/A/g, ' ').slice(0, 6) || '...';
                const isSongSelected = selectedVersion ? song.versions.some(v => v.id === selectedVersion.id) : false;
                return (
                  <button
                    key={song.id}
                    onClick={() => handleCollapsedSongClick(song)}
                    className={`w-full text-xs py-2 text-center ${
                      isSongSelected 
                        ? 'text-white' 
                        : 'text-gray-300'
                    }`}
                    title={song.title}
                  >
                    {abbreviation}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`flex-1 w-full max-w-[650px] ${isCreatingVersion ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex gap-2 items-center mb-3">
              <SearchInput
                ref={searchInputRef}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
              <div className="flex gap-0 ">
                <button
                  onClick={() => setSortOption('alphabetical')}
                  className={`text-xs px-2 whitespace-nowrap outline-none border-none ${
                    sortOption === 'alphabetical' 
                      ? 'underline text-white' 
                      : 'text-gray-400 hover:underline'
                  }`}
                >
                  A-Z
                </button>
                <button
                  onClick={() => setSortOption('recently-updated')}
                  className={`text-xs px-2 whitespace-nowrap border-l border-gray-500 ${
                    sortOption === 'recently-updated' 
                      ? 'underline text-white' 
                      : 'text-gray-400 hover:underline'
                  }`}
                >
                  Recent
                </button>
              </div>
              <CreateSongButton
                onSongCreated={fetchSongs}
                onError={setListError}
              />
              <DownloadAllSongsButton />
              <button
                onClick={() => setIsListCollapsed(true)}
                className="text-xl px-2 py-1 text-gray-400 whitespace-nowrap"
              >
                «
              </button>
            </div>
            
            {filteredSongs.map((song) => (
              <SongItem
                key={song.id}
                song={song}
                selectedVersionId={selectedVersion?.id}
                onVersionClick={handleSongVersionClick}
                onCreateNewVersion={handleCreateNewVersionForSong}
              />
            ))}
          </div>
        )}
        
        {selectedVersion && (() => {
          const song = songs.find(s => s.versions.some(v => v.id === selectedVersion.id));
          return (
            <div className="flex-1">
              <VersionDetailPanel
                songTitle={song?.title || ''}
                version={selectedVersion}
                previousVersions={previousVersions}
                isExpandedPreviousVersions={isExpandedPreviousVersions}
                isCreatingVersion={isCreatingVersion}
                newVersionForm={newVersionForm}
                isSubmitting={isSubmitting}
                isArchiving={isArchiving}
                error={panelError}
                songId={song?.id}
                tags={song?.tags || []}
                onClose={handleClosePanel}
                onTogglePreviousVersions={togglePreviousVersions}
                onVersionClick={handleSongVersionClick}
                onCreateVersionClick={handleCreateVersionClick}
                onCancelCreateVersion={cancelVersionCreation}
                onFormChange={handleFormChange}
                onSubmitVersion={handleSubmitVersion}
                onArchiveVersion={handleArchiveVersion}
              />
            </div>
          );
        })()}
        {creatingVersionForSong && !selectedVersion && (
          <div className="border-l border-gray-200 pl-4 w-full max-w-xl">
            <div className="mb-2">
              <div className="flex items-start justify-between mb-2">
                <button onClick={handleCancelNewVersionForSong} className="text-gray-400 text-xs">× Close</button>
              </div>
              <h3 className="font-mono text-sm font-medium text-gray-200 mb-1">
                New version for: {creatingVersionForSong.title.replace(/_/g, ' ')}
              </h3>
            </div>
            <CreateVersionForm
              form={newVersionForm}
              onFormChange={handleFormChange}
              onSubmit={handleSubmitVersion}
              onCancel={handleCancelNewVersionForSong}
              isSubmitting={isSubmitting}
              error={panelError}
              autosaveKey={`song-${creatingVersionForSong.id}-draft`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SongsFileList;
