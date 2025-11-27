'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import SearchInput from './SearchInput';
import SongItem from './SongItem';
import VersionDetailPanel from './VersionDetailPanel';
import CreateVersionForm from './CreateVersionForm';
import type { Song, SongVersion } from './types';

type SongsFileListProps = {
  initialVersionId?: string;
};

const SongsFileList = ({ initialVersionId }: SongsFileListProps = {}) => {
  console.log('SongsFileList component rendering');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<SongVersion & { songId?: string; nextVersionId?: string | null; originalVersionId?: string | null } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [previousVersions, setPreviousVersions] = useState<SongVersion[]>([]);
  const [isExpandedPreviousVersions, setIsExpandedPreviousVersions] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [newVersionForm, setNewVersionForm] = useState({ label: '', content: '', audioUrl: '', bpm: 100 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingSong, setIsCreatingSong] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [isSubmittingSong, setIsSubmittingSong] = useState(false);
  const [creatingVersionForSong, setCreatingVersionForSong] = useState<Song | null>(null);
  const [sortOption, setSortOption] = useState<'alphabetical' | 'recently-updated'>('recently-updated');

  const fetchSongs = async () => {
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
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

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
      
      const aLatestVersion = a.versions.reduce((latest, version) => {
        return new Date(version.createdAt) > new Date(latest.createdAt) ? version : latest;
      }, a.versions[0]);
      const bLatestVersion = b.versions.reduce((latest, version) => {
        return new Date(version.createdAt) > new Date(latest.createdAt) ? version : latest;
      }, b.versions[0]);
      return new Date(bLatestVersion.createdAt).getTime() - new Date(aLatestVersion.createdAt).getTime();
    }
    return 0;
  });

  const applyVersionSelection = useCallback(async (version: SongVersion) => {
    setSelectedVersion(version);
    setIsExpandedPreviousVersions(false);
    setIsCreatingVersion(false);
    
    try {
      const response = await fetch(`/api/songs/versions/${version.id}`);
      if (!response.ok) {
        throw new Error('Failed to load version details');
      }
      const data = await response.json();
      setPreviousVersions(data.previousVersions || []);
      if (data.version) {
        setSelectedVersion(data.version as SongVersion);
      }
    } catch (err) {
      console.error('Error loading version details:', err);
      setPreviousVersions([]);
    }
  }, []);

  const handleVersionClick = async (version: SongVersion, options?: { skipUrlUpdate?: boolean }) => {
    if (selectedVersion?.id === version.id) {
      setSelectedVersion(null);
      setPreviousVersions([]);
      setIsExpandedPreviousVersions(false);
      setIsCreatingVersion(false);
      if (!options?.skipUrlUpdate) {
        window.history.pushState(null, '', '/songs');
      }
      return;
    }

    await applyVersionSelection(version);
    if (!options?.skipUrlUpdate) {
      window.history.pushState(null, '', `/songs/${version.id}`);
    }
  };

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
    applyVersionSelection(targetVersion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVersionId, songs, applyVersionSelection]);

  const handleCreateVersionClick = () => {
    setIsCreatingVersion(true);
    setNewVersionForm({
      label: selectedVersion?.label || '',
      content: selectedVersion?.content || '',
      audioUrl: selectedVersion?.audioUrl || '',
      bpm: selectedVersion?.bpm || 100,
    });
  };

  const handleCreateNewVersionForSong = (song: Song) => {
    setCreatingVersionForSong(song);
    setSelectedVersion(null);
    setPreviousVersions([]);
    setIsCreatingVersion(true);
    setNewVersionForm({ label: '', content: '', audioUrl: '', bpm: 100 });
  };

  const handleCancelCreateVersion = () => {
    setIsCreatingVersion(false);
    setCreatingVersionForSong(null);
    setNewVersionForm({ label: '', content: '', audioUrl: '', bpm: 100 });
  };

  const handleFormChange = (updates: Partial<{ label: string; content: string; audioUrl: string; bpm: number }>) => {
    setNewVersionForm({ ...newVersionForm, ...updates });
  };

  const handleClose = () => {
    setSelectedVersion(null);
    setPreviousVersions([]);
    setIsExpandedPreviousVersions(false);
    setIsCreatingVersion(false);
    window.history.pushState(null, '', '/songs');
  };

  const handleSubmitVersion = async () => {
    if (!selectedVersion && !creatingVersionForSong) return;
    
    if (!newVersionForm.label.trim()) {
      setError('Label is required');
      return;
    }
    
    const songId = creatingVersionForSong?.id || (selectedVersion as SongVersion & { songId: string }).songId || songs.find(song => 
      song.versions.some(v => v.id === selectedVersion!.id)
    )?.id;
    
    if (!songId) {
      setError('Could not determine song ID');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/songs/versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songId: songId,
          label: newVersionForm.label,
          content: newVersionForm.content || null,
          audioUrl: newVersionForm.audioUrl || null,
          bpm: newVersionForm.bpm || null,
          previousVersionId: selectedVersion?.id || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create version');
      }

      const data = await response.json();
      setIsCreatingVersion(false);
      setCreatingVersionForSong(null);
      setNewVersionForm({ label: '', content: '', audioUrl: '', bpm: 100 });
      
      const oldSelectedVersion = selectedVersion;
      const newVersion = data.version;
      
      await fetchSongs();
      
      setSelectedVersion(newVersion);
      setPreviousVersions(oldSelectedVersion ? [oldSelectedVersion, ...previousVersions] : previousVersions);
    } catch (err) {
      console.error('Error creating version:', err);
      setError(err instanceof Error ? err.message : 'Failed to create version');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSong = async () => {
    if (!newSongTitle.trim()) {
      setError('Song title is required');
      return;
    }
    
    setIsSubmittingSong(true);
    setError(null);
    
    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSongTitle.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create song');
      }

      setIsCreatingSong(false);
      setNewSongTitle('');
      await fetchSongs();
    } catch (err) {
      console.error('Error creating song:', err);
      setError(err instanceof Error ? err.message : 'Failed to create song');
    } finally {
      setIsSubmittingSong(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-600">Loading songs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 relative">
      <div className="flex gap-4  justify-center">
        <div className="flex-2 w-full max-w-[650px] overflow-y-auto h-[calc(100vh-2rem)] scrollbar-hide">
          <div className="flex gap-2 items-center mb-3">
            <SearchInput
              ref={searchInputRef}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
            <div className="flex gap-0 border border-gray-300">
              <button
                onClick={() => setSortOption('alphabetical')}
                className={`text-xs px-2 py-1 whitespace-nowrap ${
                  sortOption === 'alphabetical' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                A-Z
              </button>
              <button
                onClick={() => setSortOption('recently-updated')}
                className={`text-xs px-2 py-1 whitespace-nowrap border-l border-gray-300 ${
                  sortOption === 'recently-updated' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Recent
              </button>
            </div>
            <button
              onClick={() => setIsCreatingSong(!isCreatingSong)}
              className="text-xs px-2 py-1 bg-blue-600 text-white whitespace-nowrap"
            >
              + Song
            </button>
          </div>
          {isCreatingSong && (
            <div className="flex gap-2 items-center mb-3">
              <input
                type="text"
                value={newSongTitle}
                onChange={(e) => setNewSongTitle(e.target.value)}
                placeholder="Song title"
                className="flex-1 px-2 py-1 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSong()}
              />
              <button onClick={handleCreateSong} disabled={isSubmittingSong} className="text-xs px-2 py-1 bg-green-600 text-white disabled:opacity-50">
                {isSubmittingSong ? '...' : 'Create'}
              </button>
              <button onClick={() => { setIsCreatingSong(false); setNewSongTitle(''); }} className="text-xs px-2 py-1 text-gray-600">
                Cancel
              </button>
            </div>
          )}
          
          {filteredSongs.map((song) => (
            <SongItem
              key={song.id}
              song={song}
              selectedVersionId={selectedVersion?.id}
              onVersionClick={handleVersionClick}
              onCreateNewVersion={handleCreateNewVersionForSong}
            />
          ))}
        </div>
        
        {selectedVersion && (
          <VersionDetailPanel
            songTitle={songs.find(s => s.versions.some(v => v.id === selectedVersion.id))?.title || ''}
            version={selectedVersion}
            previousVersions={previousVersions}
            isExpandedPreviousVersions={isExpandedPreviousVersions}
            isCreatingVersion={isCreatingVersion}
            newVersionForm={newVersionForm}
            isSubmitting={isSubmitting}
            error={error}
            onClose={handleClose}
            onTogglePreviousVersions={() => setIsExpandedPreviousVersions(!isExpandedPreviousVersions)}
            onVersionClick={handleVersionClick}
            onCreateVersionClick={handleCreateVersionClick}
            onCancelCreateVersion={handleCancelCreateVersion}
            onFormChange={handleFormChange}
            onSubmitVersion={handleSubmitVersion}
          />
        )}
        {creatingVersionForSong && !selectedVersion && (
          <div className="border-l border-gray-200 pl-4 w-full max-w-xl">
            <div className="mb-2">
              <div className="flex items-start justify-between mb-2">
                <button onClick={handleCancelCreateVersion} className="text-gray-400 text-xs">× Close</button>
              </div>
              <h3 className="font-mono text-sm font-medium text-gray-800 mb-1">
                New version for: {creatingVersionForSong.title.replace(/_/g, ' ')}
              </h3>
            </div>
            <CreateVersionForm
              form={newVersionForm}
              onFormChange={handleFormChange}
              onSubmit={handleSubmitVersion}
              onCancel={handleCancelCreateVersion}
              isSubmitting={isSubmitting}
              error={error}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SongsFileList;
