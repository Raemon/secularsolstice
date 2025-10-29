'use client';

import { useState, useEffect } from 'react';
import SheetMusicViewer from './SheetMusicViewer';
import PDFViewer from './PDFViewer';
import { usePdfToLilypond } from './usePdfToLilypond';

type Song = {
  name: string;
  files: { name: string; size: number; }[];
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
  const { convertPdf, getConversionStatus } = usePdfToLilypond();

  useEffect(() => {
    fetchSongs();
  }, []);

  const isAudioFile = (fileName: string): boolean => {
    const audioExtensions = ['.mp3', '.wav', '.aiff', '.aif', '.ogg', '.flac', '.m4a', '.aac', '.wma'];
    return audioExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const isMusicScoreFile = (fileName: string): boolean => {
    return fileName.toLowerCase().endsWith('.mscz');
  };

  const isPDFFile = (fileName: string): boolean => {
    return fileName.toLowerCase().endsWith('.pdf');
  };

  const fetchSongs = async () => {
    console.log('fetchSongs');
    try {
      setLoading(true);
      console.log('fetching songs');
      const response = await fetch('/api/songs');
      console.log('response', response);
      if (!response.ok) throw new Error('Failed to fetch songs');
      console.log('response ok');
      const data = await response.json();
      setSongs(data.songs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
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

      // Skip fetching content for audio and PDF files (they'll be loaded directly via src)
      if (isAudioFile(fileName) || isPDFFile(fileName)) {
        return;
      }

      // Fetch content if not already loaded
      if (!fileContents[fileKey]) {
        setLoadingFiles(new Set(loadingFiles).add(fileKey));
        try {
          // Check if this is a .mscz file
          if (fileName.toLowerCase().endsWith('.mscz')) {
            // Fetch the .mscz file as a blob
            const msczResponse = await fetch(`/api/songs?song=${encodeURIComponent(songName)}&file=${encodeURIComponent(fileName)}`);
            if (!msczResponse.ok) throw new Error('Failed to fetch .mscz file');
            const msczBlob = await msczResponse.blob();
            
            // Convert it using the convert API
            const formData = new FormData();
            formData.append('file', msczBlob, fileName);
            
            const convertResponse = await fetch('/api/convert', {
              method: 'POST',
              body: formData,
            });
            
            if (!convertResponse.ok) {
              const errorData = await convertResponse.json();
              throw new Error(errorData.error || 'Failed to convert .mscz file');
            }
            const mxmlContent = await convertResponse.text();
            setFileContents(prev => ({ ...prev, [fileKey]: mxmlContent }));
          } else {
            // For other files, fetch content normally
            const response = await fetch(`/api/songs?song=${encodeURIComponent(songName)}&file=${encodeURIComponent(fileName)}`);
            if (!response.ok) throw new Error('Failed to fetch file content');
            const data = await response.json();
            setFileContents(prev => ({ ...prev, [fileKey]: data.content }));
          }
        } catch (err) {
          setFileContents(prev => ({ ...prev, [fileKey]: `Error loading file content: ${err instanceof Error ? err.message : 'Unknown error'}` }));
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
        
        <div className="grid grid-cols-[200px_1fr] gap-x-4 gap-y-2">
          {songs.map((song) => (
            <>
              <div key={`${song.name}-title`} className="text-base font-medium border-b border-gray-200">{song.name.replace(/_/g, ' ')}</div>
              <div key={`${song.name}-files`} className="space-y-1 border-b border-gray-200">
                {song.files.map((file) => {
                  const fileKey = `${song.name}/${file.name}`;
                  const isExpanded = expandedFiles.has(fileKey);
                  const isLoadingFile = loadingFiles.has(fileKey);
                  
                  return (
                    <div key={file.name}>
                      <button onClick={() => toggleFile(song.name, file.name)} className="w-full px-2 py-1 hover:bg-gray-100 text-left font-mono text-sm flex items-center justify-between">
                        <span className="text-gray-700">{file.name} <span className="text-gray-500">({formatFileSize(file.size)})</span></span>
                        <span className="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
                      </button>
                      
                      {isExpanded && (
                        <div className="bg-gray-100 p-2 ml-4">
                          {isAudioFile(file.name) ? (
                            <audio controls src={`/api/songs?song=${encodeURIComponent(song.name)}&file=${encodeURIComponent(file.name)}`} className="w-full">
                              Your browser does not support the audio element.
                            </audio>
                          ) : isPDFFile(file.name) ? (
                            <PDFViewer fileUrl={`/api/songs?song=${encodeURIComponent(song.name)}&file=${encodeURIComponent(file.name)}`} />
                          ) : isLoadingFile ? (
                            <p className="text-gray-500 text-xs">Loading...</p>
                          ) : isMusicScoreFile(file.name) ? (
                            <SheetMusicViewer musicXml={fileContents[fileKey]} />
                          ) : (
                            <pre className="text-gray-800 text-xs overflow-x-auto whitespace-pre-wrap break-words">{fileContents[fileKey]}</pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SongsFileList;

