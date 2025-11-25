import { useState, useEffect, useCallback } from 'react';
import { parseHTMLContent } from '../../src/components/slides/utils';
import type { Song, Section, ProcessResult, StatusType } from './types';
import { ParsedLine } from '../../src/components/slides/types';

const groupIntoSections = (lines: ParsedLine[]): Section[] => {
  const result: Section[] = [];
  let currentTitle = '';
  let currentLines: ParsedLine[] = [];

  const flushSection = () => {
    if (!currentTitle) return;
    const contentLines = currentLines
      .filter(line => line.text && !line.isHeading)
      .map(line => line.text || '');
    result.push({
      title: currentTitle,
      content: contentLines.join('\n').trim(),
      lines: currentLines,
    });
  };

  for (const line of lines) {
    if (line.isHeading && line.text) {
      flushSection();
      currentTitle = line.text;
      currentLines = [];
    } else if (!line.isHr && !line.isEmpty) {
      currentLines.push(line);
    }
  }
  flushSection();
  return result;
};

const findMatchingSong = (title: string, songsList: Song[]): Song | null => {
  const normalizedTitle = title.trim().toLowerCase();
  return songsList.find(song => song.title.toLowerCase() === normalizedTitle) || null;
};

export const useSongs = () => {
  const [songs, setSongs] = useState<Song[]>([]);

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

  return { songs, loadSongs };
};

export const useSections = (htmlContent: string) => {
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    if (htmlContent.trim()) {
      const parsedLines = parseHTMLContent(htmlContent);
      const parsedSections = groupIntoSections(parsedLines);
      setSections(parsedSections);
    } else {
      setSections([]);
    }
  }, [htmlContent]);

  return sections;
};

export const useStatus = () => {
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<StatusType>(null);

  const showStatus = useCallback((message: string, type: StatusType) => {
    setStatusMessage(message);
    setStatusType(type);
  }, []);

  return { statusMessage, statusType, showStatus };
};

export const useProcessSections = (
  songs: Song[],
  loadSongs: () => Promise<Song[]>,
  sections: Section[],
  versionSuffix: string
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessResult[]>([]);

  const processSections = async () => {
    if (!versionSuffix.trim()) {
      alert('Please enter a version suffix');
      return;
    }

    setIsProcessing(true);
    setResults([]);

    if (sections.length === 0) {
      alert('No sections found. Make sure your text contains headings (h1-h6)');
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

    const processedResults: ProcessResult[] = [];

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

  return { isProcessing, results, processSections };
};

export const usePreviewItems = (sections: Section[], songs: Song[], versionSuffix: string) => {
  return sections.map(section => {
    const matchedSong = findMatchingSong(section.title, songs);
    return {
      sectionTitle: section.title,
      song: matchedSong,
      versionName: versionSuffix.trim() || '(no suffix)',
      contentPreview: section.content.slice(0, 100) + (section.content.length > 100 ? '...' : ''),
    };
  });
};

