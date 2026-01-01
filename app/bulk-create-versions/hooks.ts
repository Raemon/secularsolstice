import { useState, useEffect, useCallback, useMemo } from 'react';
import { parseHTMLContent } from '../../src/components/slides/slideUtils';
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

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
};

const calculateSimilarity = (str1: string, str2: string): number => {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100;
  return Math.round(((maxLength - distance) / maxLength) * 100);
};

const calculateSubstringMatch = (str1: string, str2: string, minChars: number = 15): number => {
  const lower1 = str1.toLowerCase().trim();
  const lower2 = str2.toLowerCase().trim();
  const shorter = lower1.length <= lower2.length ? lower1 : lower2;
  const longer = lower1.length <= lower2.length ? lower2 : lower1;
  if (longer.includes(shorter) && shorter.length >= minChars) {
    return 95;
  }
  return 0;
};

type CandidateSong = {
  song: Song;
  similarity: number;
};

type VersionWithSimilarity = {
  versionId: string;
  contentSimilarity: number;
};

const normalizeForComparison = (text: string): string => {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
};

const calculateContentSimilarity = (content1: string | null, content2: string | null): number => {
  if (!content1 || !content2) return 0;
  const str1 = normalizeForComparison(content1);
  const str2 = normalizeForComparison(content2);
  if (str1.length === 0 && str2.length === 0) return 100;
  if (str1.length === 0 || str2.length === 0) return 0;
  // Quick length check - if lengths differ by more than 50%, low similarity
  const lengthRatio = Math.min(str1.length, str2.length) / Math.max(str1.length, str2.length);
  if (lengthRatio < 0.5) return Math.round(lengthRatio * 50);
  // Use word-based Jaccard similarity (much faster than Levenshtein for long text)
  const words1 = new Set(str1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(str2.split(' ').filter(w => w.length > 2));
  if (words1.size === 0 && words2.size === 0) return 100;
  if (words1.size === 0 || words2.size === 0) return 0;
  let intersection = 0;
  for (const word of words1) {
    if (words2.has(word)) intersection++;
  }
  const union = words1.size + words2.size - intersection;
  return Math.round((intersection / union) * 100);
};

const findBestVersionMatch = (sectionContent: string, candidates: CandidateSong[]): VersionWithSimilarity | null => {
  let bestMatch: VersionWithSimilarity | null = null;
  for (const candidate of candidates) {
    for (const version of candidate.song.versions) {
      const similarity = calculateContentSimilarity(sectionContent, version.content);
      if (!bestMatch || similarity > bestMatch.contentSimilarity) {
        bestMatch = { versionId: version.id, contentSimilarity: similarity };
      }
    }
  }
  return bestMatch;
};

const findCandidateSongs = (title: string, songsList: Song[], threshold: number = 70, limit: number = 5): CandidateSong[] => {
  const normalizedTitle = title.trim();
  const candidates: CandidateSong[] = [];
  for (const song of songsList) {
    const substringMatch = calculateSubstringMatch(normalizedTitle, song.title);
    const levenshteinMatch = calculateSimilarity(normalizedTitle, song.title);
    const similarity = Math.max(substringMatch, levenshteinMatch);
    if (similarity >= threshold) {
      candidates.push({ song, similarity });
    }
  }
  candidates.sort((a, b) => b.similarity - a.similarity);
  return candidates.slice(0, limit);
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
  versionSuffix: string,
  userName: string,
  previewItems: import('./types').PreviewItem[]
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessResult[]>([]);

  const processSections = async () => {
    if (!versionSuffix.trim()) {
      alert('Please enter a version suffix');
      return;
    }

    if (!userName || userName.trim().length < 3) {
      alert('Please set your username (at least 3 characters) before creating versions');
      return;
    }

    setIsProcessing(true);
    setResults([]);

    // Filter to only items that are not marked "don't import"
    const itemsToProcess = previewItems.filter(item => !item.dontImport);
    if (itemsToProcess.length === 0) {
      alert('No items selected for import. Uncheck "don\'t import" on items you want to process.');
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

    for (const item of itemsToProcess) {
      if (item.candidateSong === null) {
        // Create new song
        processedResults.push({ title: item.sectionTitle, matched: false });
        continue;
      }

      const matchedSong = songsToUse.find(s => s.id === item.candidateSong!.song.id);
      if (!matchedSong) {
        processedResults.push({ title: item.sectionTitle, matched: false });
        continue;
      }

      const previousVersionId = item.selectedVersionId;

      try {
        const response = await fetch('/api/songs/versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            songId: matchedSong.id,
            label: versionSuffix.trim(),
            content: item.content,
            previousVersionId,
            createdBy: userName,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          processedResults.push({
            title: item.sectionTitle,
            matched: true,
            songId: matchedSong.id,
            error: errorData.error || 'Failed to create version',
          });
        } else {
          processedResults.push({
            title: item.sectionTitle,
            matched: true,
            songId: matchedSong.id,
          });
        }
      } catch (error) {
        processedResults.push({
          title: item.sectionTitle,
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

export type SelectionState = {
  selectedVersionId: string | null;
  dontImport: boolean;
};

export const usePreviewItems = (sections: Section[], songs: Song[], versionSuffix: string, selectionStates: Map<string, SelectionState>) => {
  return useMemo(() => {
    const items: import('./types').PreviewItem[] = [];
    for (const section of sections) {
      const candidateSongs = findCandidateSongs(section.title, songs);
      // Find best match for auto-selection
      let bestVersionId: string | null = null;
      let bestSongId: string | null = null;
      if (candidateSongs.length > 0) {
        const bestMatch = findBestVersionMatch(section.content, candidateSongs);
        if (bestMatch && bestMatch.contentSimilarity > 50) {
          bestVersionId = bestMatch.versionId;
          // Find which song has this version
          for (const c of candidateSongs) {
            if (c.song.versions.some(v => v.id === bestVersionId)) {
              bestSongId = c.song.id;
              break;
            }
          }
        }
      }
      // Add "create new song" option
      const newKey = `${section.title}::new`;
      const newSelection = selectionStates.get(newKey);
      const hasGoodMatch = candidateSongs.length > 0 && candidateSongs[0].similarity >= 90;
      items.push({
        itemKey: newKey,
        sectionTitle: section.title,
        candidateSong: null,
        selectedVersionId: null,
        dontImport: newSelection?.dontImport ?? hasGoodMatch, // default: don't import if good match exists
        versionName: versionSuffix.trim() || '(no suffix)',
        content: section.content,
        contentPreview: section.content.slice(0, 100) + (section.content.length > 100 ? '...' : ''),
      });
      // Add one item per candidate song
      for (let i = 0; i < candidateSongs.length; i++) {
        const candidate = candidateSongs[i];
        const itemKey = `${section.title}::${candidate.song.id}`;
        const userSelection = selectionStates.get(itemKey);
        // Default: best match is selected, others are "don't import"
        const isBestMatch = candidate.song.id === bestSongId;
        let selectedVersionId: string | null = null;
        let dontImport: boolean;
        if (userSelection !== undefined) {
          selectedVersionId = userSelection.selectedVersionId;
          dontImport = userSelection.dontImport;
        } else {
          // Auto-select: only best match is enabled, others default to "don't import"
          dontImport = !isBestMatch;
          if (isBestMatch && bestVersionId) {
            selectedVersionId = bestVersionId;
          } else if (!dontImport && candidate.song.versions.length > 0) {
            // If enabled but no specific version, select the latest
            const latestVersion = candidate.song.versions.find(v => v.nextVersionId === null);
            selectedVersionId = latestVersion?.id || candidate.song.versions[0].id;
          }
        }
        items.push({
          itemKey,
          sectionTitle: section.title,
          candidateSong: candidate,
          selectedVersionId,
          dontImport,
          versionName: versionSuffix.trim() || '(no suffix)',
          content: section.content,
          contentPreview: section.content.slice(0, 100) + (section.content.length > 100 ? '...' : ''),
        });
      }
    }
    return items;
  }, [sections, songs, versionSuffix, selectionStates]);
};
