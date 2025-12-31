'use client';

import maxBy from 'lodash/maxBy';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SearchInput from './SearchInput';
import SongItem from './SongItem';
import VersionDetailPanel from './VersionDetailPanel';
import SongInfoHeader from './SongInfoHeader';
import VersionHeader from './VersionHeader';
import VersionContent from './VersionContent';
import type { Song, SongVersion } from './types';
import { useUser } from '../contexts/UserContext';
import useSongsProgressiveLoad from '../hooks/useSongsProgressiveLoad';
import CreateSongButton from '../components/CreateSongButton';
import { detectFileType } from '@/lib/lyricsExtractor';
import { generateChordmarkRenderedContent } from '../chordmark-converter/clientRenderUtils';

const getLatestVersion = (versions: SongVersion[]) => maxBy(versions, (version) => new Date(version.createdAt).getTime());

type SongsFileListProps = {
  initialSongId?: string;
  initialVersionId?: string;
};

const SongsFileList = ({ initialSongId, initialVersionId }: SongsFileListProps = {}) => {
  const router = useRouter();
  const { userName } = useUser();
  const { songs, loading, loadingMore, error: listError, refetch: fetchSongs } = useSongsProgressiveLoad();
  const [localError, setLocalError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [sortOption, setSortOption] = useState<'alphabetical' | 'recently-updated'>('recently-updated');

  // Version detail state
  const [selectedVersion, setSelectedVersion] = useState<SongVersion | null>(null);
  const [previousVersions, setPreviousVersions] = useState<SongVersion[]>([]);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [newVersionForm, setNewVersionForm] = useState({
    label: '', content: '', audioUrl: '', slidesMovieUrl: '', slideMovieStart: 0,
    bpm: 0, transpose: 0, previousVersionId: '', nextVersionId: '',
    slideCredits: '', programCredits: '', blobUrl: '',
  });

  // Song-only view state (when viewing /songs/[songId] without version)
  const showSongOnly = initialSongId && !initialVersionId;

  // Find the selected song from the list
  const selectedSong = useMemo(() => {
    if (initialSongId) {
      return songs.find(s => s.id === initialSongId) || null;
    }
    if (selectedVersion) {
      return songs.find(s => s.versions.some(v => v.id === selectedVersion.id)) || null;
    }
    return null;
  }, [initialSongId, selectedVersion, songs]);

  // Fetch version details when initialVersionId changes
  useEffect(() => {
    if (!initialVersionId) {
      setSelectedVersion(null);
      setPreviousVersions([]);
      return;
    }
    const fetchVersion = async () => {
      try {
        const res = await fetch(`/api/songs/versions/${initialVersionId}`);
        if (!res.ok) throw new Error('Failed to load version');
        const data = await res.json();
        setSelectedVersion(data.version);
        setPreviousVersions(data.previousVersions || []);
      } catch (err) {
        console.error('Error fetching version:', err);
      }
    };
    fetchVersion();
  }, [initialVersionId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && (selectedVersion || showSongOnly)) {
        router.push('/songs');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedVersion, showSongOnly, router]);

  const filteredSongs = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return songs.filter(song => {
      if (song.title.toLowerCase().includes(searchLower)) return true;
      return song.versions.some(version => version.label.toLowerCase().includes(searchLower));
    }).sort((a, b) => {
      const aOnlyReadme = a.versions.length > 0 && a.versions.every(v => v.label === 'README.md');
      const bOnlyReadme = b.versions.length > 0 && b.versions.every(v => v.label === 'README.md');
      if (aOnlyReadme && !bOnlyReadme) return 1;
      if (!aOnlyReadme && bOnlyReadme) return -1;
      if (sortOption === 'alphabetical') {
        return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
      } else if (sortOption === 'recently-updated') {
        if (a.versions.length === 0 && b.versions.length === 0) return 0;
        if (a.versions.length === 0) return 1;
        if (b.versions.length === 0) return -1;
        const aLatest = getLatestVersion(a.versions);
        const bLatest = getLatestVersion(b.versions);
        if (!aLatest || !bLatest) return 0;
        return new Date(bLatest.createdAt).getTime() - new Date(aLatest.createdAt).getTime();
      }
      return 0;
    });
  }, [songs, searchTerm, sortOption]);

  const handleClose = () => router.push('/songs');

  const handleCreateVersionClick = () => {
    if (!selectedVersion) return;
    setNewVersionForm({
      label: selectedVersion.label, content: selectedVersion.content || '',
      audioUrl: selectedVersion.audioUrl || '', slidesMovieUrl: selectedVersion.slidesMovieUrl || '',
      slideMovieStart: selectedVersion.slideMovieStart || 0, bpm: selectedVersion.bpm || 0,
      transpose: selectedVersion.transpose || 0, previousVersionId: selectedVersion.id, nextVersionId: '',
      slideCredits: selectedVersion.slideCredits || '', programCredits: selectedVersion.programCredits || '',
      blobUrl: selectedVersion.blobUrl || '',
    });
    setIsCreatingVersion(true);
    setPanelError(null);
  };

  const handleCancelCreateVersion = () => {
    setIsCreatingVersion(false);
    setPanelError(null);
  };

  const handleFormChange = (updates: Partial<typeof newVersionForm>) => {
    setNewVersionForm(prev => ({ ...prev, ...updates }));
    setPanelError(null);
  };

  const handleSubmitVersion = async () => {
    const trimmedLabel = newVersionForm.label.trim();
    if (!trimmedLabel) { setPanelError('Label is required'); return; }
    if (!userName || userName.trim().length < 3) {
      setPanelError('Please set your username (at least 3 characters) before creating versions');
      return;
    }
    if (!selectedSong) { setPanelError('Could not determine song'); return; }
    setIsSubmitting(true);
    setPanelError(null);
    try {
      const fileType = detectFileType(trimmedLabel, newVersionForm.content);
      const renderedContent = fileType === 'chordmark' && newVersionForm.content
        ? generateChordmarkRenderedContent(newVersionForm.content) : undefined;
      const response = await fetch('/api/songs/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId: selectedSong.id, label: trimmedLabel, content: newVersionForm.content || null,
          audioUrl: newVersionForm.audioUrl || null, slidesMovieUrl: newVersionForm.slidesMovieUrl || null,
          slideMovieStart: newVersionForm.slideMovieStart ?? null, bpm: newVersionForm.bpm || null,
          transpose: newVersionForm.transpose ?? null, previousVersionId: selectedVersion?.id || null,
          createdBy: userName, renderedContent, slideCredits: newVersionForm.slideCredits || null,
          programCredits: newVersionForm.programCredits || null, blobUrl: newVersionForm.blobUrl || null,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create version');
      }
      const data = await response.json();
      setIsCreatingVersion(false);
      await fetchSongs();
      router.push(`/songs/${selectedSong.id}/${data.version.id}`);
    } catch (err) {
      console.error('Error creating version:', err);
      setPanelError(err instanceof Error ? err.message : 'Failed to create version');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveVersion = async () => {
    if (!selectedVersion || !selectedSong) return;
    if (!window.confirm('Delete this version?')) return;
    setIsArchiving(true);
    setPanelError(null);
    try {
      const response = await fetch(`/api/songs/versions/${selectedVersion.id}/archive`, { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete version');
      }
      await fetchSongs();
      router.push(`/songs/${selectedSong.id}`);
    } catch (err) {
      console.error('Error deleting version:', err);
      setPanelError(err instanceof Error ? err.message : 'Failed to delete version');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleVersionClick = (v: SongVersion) => {
    if (selectedSong) {
      router.push(`/songs/${selectedSong.id}/${v.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-400">Loading songs...</p>
        </div>
      </div>
    );
  }

  const displayError = listError || localError;
  if (displayError) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-red-600">Error: {displayError}</p>
        </div>
      </div>
    );
  }

  const hasDetailPanel = selectedVersion || showSongOnly;

  return (
    <div className="min-h-[calc(100vh-100px)] pt-8 relative">
      <div className="flex gap-4 justify-center">
        {/* Song list - on small screens hide when detail is shown, on xl+ always show greyed */}
        <div className={`h-[calc(100vh-120px)] px-4 overflow-y-auto shrink-0 max-w-[650px] ${hasDetailPanel ? `hidden xl:block w-[650px] ${isCreatingVersion ? 'opacity-50' : 'opacity-50 hover:opacity-100'}` : 'flex-1 w-full'}`}>
          <div className="flex gap-2 items-center mb-4 sticky top-0 bg-[#11101b] pb-4 z-10">
            <SearchInput ref={searchInputRef} searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            <div className="flex gap-0">
              <button
                onClick={() => setSortOption('alphabetical')}
                className={`text-xs px-2 whitespace-nowrap outline-none border-none ${sortOption === 'alphabetical' ? 'underline text-white' : 'text-gray-400 hover:underline'}`}
              >A-Z</button>
              <button
                onClick={() => setSortOption('recently-updated')}
                className={`text-xs px-2 whitespace-nowrap border-l border-gray-500 ${sortOption === 'recently-updated' ? 'underline text-white' : 'text-gray-400 hover:underline'}`}
              >Recent</button>
            </div>
            <CreateSongButton onSongCreated={fetchSongs} onError={setLocalError} />
          </div>
          {filteredSongs.map((song) => (
            <SongItem
              key={song.id}
              song={song}
              selectedSongId={initialSongId}
              selectedVersionId={initialVersionId}
            />
          ))}
        </div>

        {/* Version detail panel */}
        {selectedVersion && selectedSong && (
          <div className="flex-1 h-[calc(100vh-120px)] overflow-y-auto">
            <VersionDetailPanel
              songTitle={selectedSong.title}
              version={selectedVersion}
              previousVersions={previousVersions}
              isExpandedPreviousVersions={false}
              isCreatingVersion={isCreatingVersion}
              newVersionForm={newVersionForm}
              isSubmitting={isSubmitting}
              isArchiving={isArchiving}
              error={panelError}
              songId={selectedSong.id}
              tags={selectedSong.tags}
              onClose={handleClose}
              onTogglePreviousVersions={() => {}}
              onVersionClick={handleVersionClick}
              onCreateVersionClick={handleCreateVersionClick}
              onCancelCreateVersion={handleCancelCreateVersion}
              onFormChange={handleFormChange}
              onSubmitVersion={handleSubmitVersion}
              onArchiveVersion={handleArchiveVersion}
            />
          </div>
        )}

        {/* Song-only view (all versions) */}
        {showSongOnly && selectedSong && !selectedVersion && (
          <div className="flex-1 h-[calc(100vh-120px)] overflow-y-auto">
            <div className="pl-4 w-full lg:p-20 relative max-w-4xl mx-auto">
              <SongInfoHeader
                songId={selectedSong.id}
                title={selectedSong.title}
                tags={selectedSong.tags}
                onClose={handleClose}
                onArchive={fetchSongs}
              />
              {selectedSong.versions.map(version => (
                <div key={version.id} className="mb-8 flex flex-col gap-2">
                  <VersionHeader version={version} />
                  <div className="border-b border-gray-500 pb-3">
                    <VersionContent version={version} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SongsFileList;