'use client';

import { useState, useEffect, Fragment } from 'react';
import { marked } from 'marked';
import SongItem from './SongItem';
import type { Song, SongVersion } from './types';

const VersionContent = ({version, isEditing, editedContent, onContentChange}: {
  version: SongVersion;
  isEditing: boolean;
  editedContent: string;
  onContentChange: (content: string) => void;
}) => {
  const hasAudio = Boolean(version.audioUrl);
  const hasContent = Boolean(version.content);
  const isTxtFile = version.label.toLowerCase().endsWith('.txt');

  if (!hasAudio && !hasContent) {
    return <p className="text-gray-500 text-xs">No stored content for this version.</p>;
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        {hasAudio && (
          <audio controls src={version.audioUrl || undefined} className="w-full">
            Your browser does not support the audio element.
          </audio>
        )}
        <textarea
          value={editedContent}
          onChange={(e) => onContentChange(e.target.value)}
          className="w-full h-96 p-2 text-xs font-mono border border-gray-300"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hasAudio && (
        <audio controls src={version.audioUrl || undefined} className="w-full">
          Your browser does not support the audio element.
        </audio>
      )}
      {hasContent && (
        isTxtFile ? (
          <pre className="text-content text-gray-800 text-xs overflow-x-auto">{version.content}</pre>
        ) : (
          <div 
            className="markdown-content text-gray-800 text-xs"
            dangerouslySetInnerHTML={{ __html: marked.parse(version.content || '') }}
          />
        )
      )}
    </div>
  );
};

const SongsFileList = () => {
  console.log('SongsFileList component rendering');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<SongVersion | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleVersionClick = (version: SongVersion) => {
    setSelectedVersion(prev => prev?.id === version.id ? null : version);
    setIsEditing(false);
    setEditedContent('');
  };

  const handleEditClick = () => {
    if (selectedVersion) {
      setEditedContent(selectedVersion.content || '');
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  const handleSaveEdit = async () => {
    if (!selectedVersion) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/songs/versions/${selectedVersion.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editedContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      const data = await response.json();
      setSelectedVersion(data.version);
      setIsEditing(false);
      
      // Refresh the songs list to get updated content
      await fetchSongs();
    } catch (err) {
      console.error('Error saving version:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
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
      <div className="flex gap-4 h-[calc(100vh-2rem)] mx-auto max-w-7xl">
        <div className="flex-1 overflow-y-auto max-w-md">
          <input
            type="text"
            placeholder="Search songs or versions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-3 px-2 py-1 w-full max-w-md"
          />
          
          <div className="grid grid-cols-[200px_1fr] gap-x-4">
            {filteredSongs.map((song) => (
              <Fragment key={song.id}>
                <SongItem
                  song={song}
                  renderName={true}
                />
                <SongItem
                  song={song}
                  renderFiles={true}
                  selectedVersionId={selectedVersion?.id}
                  onVersionClick={handleVersionClick}
                />
              </Fragment>
            ))}
          </div>
        </div>
        
        {selectedVersion && (
          <div className="w-96 border-l border-gray-200 pl-4 overflow-y-auto">
            <div className="mb-2">
              <div className="flex items-start justify-between mb-2">
                <button
                  onClick={() => {
                    setSelectedVersion(null);
                    setIsEditing(false);
                    setEditedContent('');
                  }}
                  className="text-gray-400 text-xs"
                >
                  × Close
                </button>
                {selectedVersion.content !== null && (
                  <button
                    onClick={isEditing ? handleCancelEdit : handleEditClick}
                    className="text-gray-600 text-xs"
                    disabled={isSaving}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                )}
              </div>
              <h3 className="font-mono text-sm font-medium text-gray-800 mb-1">
                {selectedVersion.label}
              </h3>
              <p className="text-gray-400 text-xs">
                {new Date(selectedVersion.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
              {isEditing && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="text-xs px-2 py-1 bg-blue-600 text-white disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            <VersionContent 
              version={selectedVersion} 
              isEditing={isEditing}
              editedContent={editedContent}
              onContentChange={setEditedContent}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SongsFileList;
