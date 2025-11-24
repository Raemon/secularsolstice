'use client';

import { useState, useEffect } from 'react';
import SearchInput from './SearchInput';
import SongList from './SongList';
import VersionDetailPanel from './VersionDetailPanel';
import type { Song, SongVersion } from './types';

const SongsFileList = () => {
  console.log('SongsFileList component rendering');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<SongVersion & { songId?: string; nextVersionId?: string | null; originalVersionId?: string | null } | null>(null);
  const [previousVersions, setPreviousVersions] = useState<SongVersion[]>([]);
  const [isExpandedPreviousVersions, setIsExpandedPreviousVersions] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [newVersionForm, setNewVersionForm] = useState({ label: '', content: '', audioUrl: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const filteredSongs = songs.filter(song => {
    const searchLower = searchTerm.toLowerCase();
    if (song.title.toLowerCase().includes(searchLower)) {
      return true;
    }
    return song.versions.some(version =>
      version.label.toLowerCase().includes(searchLower) ||
      (version.content && version.content.toLowerCase().includes(searchLower))
    );
  });

  const handleVersionClick = async (version: SongVersion) => {
    if (selectedVersion?.id === version.id) {
      setSelectedVersion(null);
      setPreviousVersions([]);
      setIsExpandedPreviousVersions(false);
      return;
    }
    
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
  };

  const handleCreateVersionClick = () => {
    setIsCreatingVersion(true);
    setNewVersionForm({
      label: selectedVersion?.label || '',
      content: selectedVersion?.content || '',
      audioUrl: selectedVersion?.audioUrl || '',
    });
  };

  const handleCancelCreateVersion = () => {
    setIsCreatingVersion(false);
    setNewVersionForm({ label: '', content: '', audioUrl: '' });
  };

  const handleFormChange = (updates: Partial<{ label: string; content: string; audioUrl: string }>) => {
    setNewVersionForm({ ...newVersionForm, ...updates });
  };

  const handleClose = () => {
    setSelectedVersion(null);
    setPreviousVersions([]);
    setIsExpandedPreviousVersions(false);
    setIsCreatingVersion(false);
  };

  const handleSubmitVersion = async () => {
    if (!selectedVersion) return;
    
    if (!newVersionForm.label.trim()) {
      setError('Label is required');
      return;
    }
    
    const songId = (selectedVersion as SongVersion & { songId: string }).songId || songs.find(song => 
      song.versions.some(v => v.id === selectedVersion.id)
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
          previousVersionId: selectedVersion.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create version');
      }

      const data = await response.json();
      setIsCreatingVersion(false);
      setNewVersionForm({ label: '', content: '', audioUrl: '' });
      
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
    <div className="min-h-screen p-4">
      <div className="flex gap-4 h-[calc(100vh-2rem)] mx-auto max-w-6xl">
        <div className="flex-1 overflow-y-auto max-w-md">
          <SearchInput
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
          
          <SongList
            songs={filteredSongs}
            selectedVersionId={selectedVersion?.id}
            onVersionClick={handleVersionClick}
          />
        </div>
        
        {selectedVersion && (
          <VersionDetailPanel
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
      </div>
    </div>
  );
};

export default SongsFileList;
