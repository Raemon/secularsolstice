'use client';

import { useState, useEffect } from 'react';

type Song = {
  name: string;
  files: string[];
};

type FileContent = {
  [key: string]: string;
};

const SongsFileList = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [fileContents, setFileContents] = useState<FileContent>({});
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/songs');
      if (!response.ok) throw new Error('Failed to fetch songs');
      const data = await response.json();
      setSongs(data.songs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = async (songName: string, fileName: string) => {
    const fileKey = `${songName}/${fileName}`;
    const newExpandedFiles = new Set(expandedFiles);

    if (expandedFiles.has(fileKey)) {
      newExpandedFiles.delete(fileKey);
      setExpandedFiles(newExpandedFiles);
    } else {
      newExpandedFiles.add(fileKey);
      setExpandedFiles(newExpandedFiles);

      // Fetch content if not already loaded
      if (!fileContents[fileKey]) {
        setLoadingFiles(new Set(loadingFiles).add(fileKey));
        try {
          const response = await fetch(`/api/songs?song=${encodeURIComponent(songName)}&file=${encodeURIComponent(fileName)}`);
          if (!response.ok) throw new Error('Failed to fetch file content');
          const data = await response.json();
          setFileContents(prev => ({ ...prev, [fileKey]: data.content }));
        } catch (err) {
          setFileContents(prev => ({ ...prev, [fileKey]: 'Error loading file content' }));
        } finally {
          setLoadingFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(fileKey);
            return newSet;
          });
        }
      }
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
      <div className="max-w-5xl mx-auto">
        <h1 className="text-lg font-semibold mb-3">Songs</h1>
        
        <div className="space-y-3">
          {songs.map((song) => (
            <div key={song.name} className="border-b pb-2 last:border-b-0">
              <h2 className="text-base font-medium mb-1">{song.name.replace(/_/g, ' ')}</h2>
              
              <div className="space-y-1">
                {song.files.map((file) => {
                  const fileKey = `${song.name}/${file}`;
                  const isExpanded = expandedFiles.has(fileKey);
                  const isLoadingFile = loadingFiles.has(fileKey);
                  
                  return (
                    <div key={file}>
                      <button onClick={() => toggleFile(song.name, file)} className="w-full px-2 py-1 hover:bg-gray-100 text-left font-mono text-sm flex items-center justify-between">
                        <span className="text-gray-700">{file}</span>
                        <span className="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
                      </button>
                      
                      {isExpanded && (
                        <div className="bg-gray-100 p-2 ml-4">
                          {isLoadingFile ? (
                            <p className="text-gray-500 text-xs">Loading...</p>
                          ) : (
                            <pre className="text-gray-800 text-xs overflow-x-auto whitespace-pre-wrap break-words">{fileContents[fileKey]}</pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SongsFileList;

