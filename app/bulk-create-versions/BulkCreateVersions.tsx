'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Song } from '../songs/types';

type Section = {
  title: string;
  content: string;
};

const BulkCreateVersions = () => {
  const [versionSuffix, setVersionSuffix] = useState('');
  const [formattedText, setFormattedText] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<Array<{ title: string; matched: boolean; songId?: string; error?: string }>>([]);

  const findSmallestHeadingLevel = useCallback((text: string): number => {
    const headingRegex = /^(#{1,6})\s+/gm;
    const matches = Array.from(text.matchAll(headingRegex));
    if (matches.length === 0) return 0;
    return Math.min(...matches.map(m => m[1].length));
  }, []);

  const parseSections = useCallback((text: string): Section[] => {
    const smallestLevel = findSmallestHeadingLevel(text);
    if (smallestLevel === 0) return [];

    const headingRegex = new RegExp(`^(#{${smallestLevel}})\\s+(.+)$`);
    const lines = text.split('\n');
    const sections: Section[] = [];
    let currentTitle = '';
    let currentContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(headingRegex);
      
      if (headingMatch) {
        if (currentTitle) {
          sections.push({
            title: currentTitle,
            content: currentContent.join('\n').trim(),
          });
        }
        currentTitle = headingMatch[2].trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    if (currentTitle) {
      sections.push({
        title: currentTitle,
        content: currentContent.join('\n').trim(),
      });
    }

    return sections;
  }, [findSmallestHeadingLevel]);

  const findMatchingSong = (title: string, songsList: Song[]): Song | null => {
    const normalizedTitle = title.trim().toLowerCase();
    return songsList.find(song => song.title.toLowerCase() === normalizedTitle) || null;
  };

  const loadSongs = async (): Promise<Song[]> => {
    try {
      const response = await fetch('/api/songs');
      const data = await response.json();
      const loadedSongs = data.songs || [];
      setSongs(loadedSongs);
      return loadedSongs;
    } catch (error) {
      console.error('Failed to load songs:', error);
      return [];
    }
  };

  useEffect(() => {
    loadSongs();
  }, []);

  useEffect(() => {
    if (formattedText.trim()) {
      const parsedSections = parseSections(formattedText);
      setSections(parsedSections);
    } else {
      setSections([]);
    }
  }, [formattedText, parseSections]);

  const processSections = async () => {
    if (!versionSuffix.trim()) {
      alert('Please enter a version suffix');
      return;
    }

    setIsProcessing(true);
    setResults([]);

    if (sections.length === 0) {
      alert('No sections found. Make sure your text contains headings (h2, h3, etc.)');
      setIsProcessing(false);
      return;
    }

    let songsToUse = songs;
    if (songsToUse.length === 0) {
      songsToUse = await loadSongs();
      if (songsToUse.length === 0) {
        alert('Failed to load songs. Please try again.');
        setIsProcessing(false);
        return;
      }
    }

    const processedResults: Array<{ title: string; matched: boolean; songId?: string; error?: string }> = [];

    for (const section of sections) {
      const matchedSong = findMatchingSong(section.title, songsToUse);
      
      if (!matchedSong) {
        processedResults.push({ title: section.title, matched: false });
        continue;
      }

      try {
        const latestVersion = matchedSong.versions.find(v => v.nextVersionId === null);
        const previousVersionId = latestVersion?.id || null;

        const response = await fetch('/api/songs/versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            songId: matchedSong.id,
            label: versionSuffix.trim(),
            content: section.content,
            previousVersionId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          processedResults.push({
            title: section.title,
            matched: true,
            songId: matchedSong.id,
            error: errorData.error || 'Failed to create version',
          });
        } else {
          processedResults.push({
            title: section.title,
            matched: true,
            songId: matchedSong.id,
          });
        }
      } catch (error) {
        processedResults.push({
          title: section.title,
          matched: true,
          songId: matchedSong.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    setResults(processedResults);
    setIsProcessing(false);
  };

  const previewItems = sections.map(section => {
    const matchedSong = findMatchingSong(section.title, songs);
    return {
      sectionTitle: section.title,
      song: matchedSong,
      versionName: versionSuffix.trim() || '(no suffix)',
    };
  });

  return (
    <div className="flex gap-4 p-4">
      <div className="flex-1 space-y-4">
        <div>
          <label className="text-xs text-gray-600">Version Suffix</label>
          <input
            type="text"
            value={versionSuffix}
            onChange={(e) => setVersionSuffix(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300"
            placeholder="e.g., '2024', 'draft', etc."
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Formatted Text</label>
          <textarea
            value={formattedText}
            onChange={(e) => setFormattedText(e.target.value)}
            className="w-full h-96 p-2 text-xs font-mono border border-gray-300"
            placeholder="Paste text with headings (h2, h3, etc.) here..."
          />
        </div>
        <button
          onClick={processSections}
          disabled={isProcessing}
          className="text-xs px-2 py-1 bg-blue-600 text-white disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Process Sections'}
        </button>
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold">Results:</div>
            {results.map((result, idx) => (
              <div key={idx} className="text-xs border border-gray-200 p-2">
                <div className={result.matched ? 'text-green-600' : 'text-red-600'}>
                  {result.title}: {result.matched ? '✓ Matched' : '✗ No match found'}
                </div>
                {result.error && (
                  <div className="text-red-600 mt-1">Error: {result.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="w-80 space-y-2">
        <div className="text-xs font-semibold">Preview ({previewItems.length} items):</div>
        {previewItems.length === 0 ? (
          <div className="text-xs text-gray-500">No sections found. Paste text with headings to see preview.</div>
        ) : (
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {previewItems.map((item, idx) => (
              <div key={idx} className="text-xs border border-gray-200 p-2">
                <div className={item.song ? 'text-green-600' : 'text-red-600'}>
                  {item.song ? '✓' : '✗'} {item.sectionTitle}
                </div>
                {item.song && (
                  <div className="mt-1 text-gray-600">
                    Song: {item.song.title}
                  </div>
                )}
                <div className="mt-1 text-gray-600">
                  Version: {item.versionName}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkCreateVersions;

