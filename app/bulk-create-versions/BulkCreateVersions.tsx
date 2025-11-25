'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const formattedInputRef = useRef<HTMLDivElement | null>(null);

  const findSmallestHeadingLevel = useCallback((text: string): number => {
    const headingRegex = /^(#{1,6})\s+/gm;
    const matches = Array.from(text.matchAll(headingRegex));
    if (matches.length === 0) return 0;
    return Math.min(...matches.map(m => m[1].length));
  }, []);

  const convertHtmlToPlainText = useCallback((html: string): string => {
    if (!html.trim()) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.innerText.trim();
  }, []);

  const parseHtmlSections = useCallback((html: string): Section[] => {
    if (!html.trim()) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const serializeNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
      if (node.nodeType === Node.ELEMENT_NODE) return (node as HTMLElement).outerHTML;
      return '';
    };

    const buildSections = (headingPredicate: (element: HTMLElement) => boolean): Section[] => {
      const sectionsFromHtml: Section[] = [];
      let currentTitle = '';
      let currentContentHtml: string[] = [];

      const flushSection = () => {
        if (!currentTitle) return;
        const mergedHtml = currentContentHtml.join('').trim();
        sectionsFromHtml.push({
          title: currentTitle,
          content: mergedHtml ? convertHtmlToPlainText(mergedHtml) : '',
        });
      };

      const nodes = Array.from(doc.body.childNodes);
      for (const node of nodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          if (headingPredicate(element)) {
            flushSection();
            currentTitle = element.textContent?.trim() || '';
            currentContentHtml = [];
            continue;
          }
        }
        currentContentHtml.push(serializeNode(node));
      }
      flushSection();
      return sectionsFromHtml;
    };

    // Try to find actual heading elements (h1-h6)
    const headingElements = Array.from(doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    if (headingElements.length > 0) {
      const smallestLevel = Math.min(...headingElements.map(el => Number(el.tagName.replace('H', ''))));
      const allowedHeadings = new Set(headingElements.filter(el => Number(el.tagName.replace('H', '')) === smallestLevel));
      return buildSections(element => allowedHeadings.has(element));
    }

    // Try to detect styled headings (bold text with larger font size)
    const extractFontSize = (styleText: string | null): number | null => {
      if (!styleText) return null;
      const match = styleText.match(/font-size:\s*([\d.]+)(px|pt)/i);
      if (!match) return null;
      const value = Number(match[1]);
      if (Number.isNaN(value)) return null;
      return match[2].toLowerCase() === 'pt' ? value * (96 / 72) : value;
    };

    const extractFontWeight = (styleText: string | null): number | null => {
      if (!styleText) return null;
      const match = styleText.match(/font-weight:\s*(bold|bolder|[0-9]+)/i);
      if (!match) return null;
      if (match[1].toLowerCase() === 'bold' || match[1].toLowerCase() === 'bolder') return 700;
      const value = Number(match[1]);
      return Number.isNaN(value) ? null : value;
    };

    const getFontMetrics = (element: HTMLElement): { fontSize: number | null; fontWeight: number | null } => {
      const metrics = { fontSize: null as number | null, fontWeight: null as number | null };
      const readStyles = (el: HTMLElement) => {
        if (metrics.fontSize === null) metrics.fontSize = extractFontSize(el.getAttribute('style'));
        if (metrics.fontWeight === null) metrics.fontWeight = extractFontWeight(el.getAttribute('style'));
      };
      readStyles(element);
      if (metrics.fontSize !== null && metrics.fontWeight !== null) return metrics;
      for (const span of Array.from(element.querySelectorAll('span'))) {
        readStyles(span as HTMLElement);
        if (metrics.fontSize !== null && metrics.fontWeight !== null) break;
      }
      return metrics;
    };

    const styledBlocks = Array.from(doc.body.children)
      .filter(el => el.tagName === 'P' || el.tagName === 'DIV')
      .map(el => {
        const htmlEl = el as HTMLElement;
        const text = htmlEl.textContent?.trim() || '';
        if (!text) return null;
        const metrics = getFontMetrics(htmlEl);
        const roleHeading = htmlEl.getAttribute('role') === 'heading' || !!htmlEl.querySelector('[role="heading"]');
        return { element: htmlEl, text, fontSize: metrics.fontSize, fontWeight: metrics.fontWeight, roleHeading };
      })
      .filter(Boolean) as Array<{ element: HTMLElement; text: string; fontSize: number | null; fontWeight: number | null; roleHeading: boolean }>;

    if (styledBlocks.length === 0) return [];

    const fontSizes = styledBlocks.map(b => b.fontSize).filter((s): s is number => typeof s === 'number').sort((a, b) => a - b);
    const medianFontSize = fontSizes.length > 0 ? fontSizes[Math.floor(fontSizes.length / 2)] : null;
    const maxFontSize = fontSizes.length > 0 ? fontSizes[fontSizes.length - 1] : null;

    const styledHeadings = styledBlocks.filter(block => {
      if (block.roleHeading) return true;
      if (maxFontSize !== null && block.fontSize !== null && block.fontSize >= maxFontSize - 0.5) return true;
      if (block.fontWeight !== null && block.fontWeight >= 600) {
        if (block.fontSize !== null && medianFontSize !== null && block.fontSize >= medianFontSize + 2) return true;
        if (medianFontSize === null) return true;
        if (block.fontSize === null && block.text.split(/\s+/).length <= 8) return true;
      }
      return false;
    });

    if (styledHeadings.length === 0) return [];
    const styledHeadingSet = new Set(styledHeadings.map(b => b.element));
    return buildSections(element => styledHeadingSet.has(element));
  }, [convertHtmlToPlainText]);

  const parseMarkdownSections = useCallback((text: string): Section[] => {
    const smallestLevel = findSmallestHeadingLevel(text);
    if (smallestLevel === 0) return [];

    const headingRegex = new RegExp(`^(#{${smallestLevel}})\\s+(.+)$`);
    const lines = text.split('\n');
    const markdownSections: Section[] = [];
    let currentTitle = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const headingMatch = line.match(headingRegex);
      if (headingMatch) {
        if (currentTitle) {
          markdownSections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
        }
        currentTitle = headingMatch[2].trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    if (currentTitle) {
      markdownSections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
    }
    return markdownSections;
  }, [findSmallestHeadingLevel]);

  const parseSections = useCallback((rawHtml: string): Section[] => {
    // First try to parse as HTML (for pasted formatted content)
    const htmlResult = parseHtmlSections(rawHtml);
    if (htmlResult.length > 0) return htmlResult;
    // Fall back to markdown parsing
    const temp = document.createElement('div');
    temp.innerHTML = rawHtml;
    return parseMarkdownSections(temp.innerText || '');
  }, [parseHtmlSections, parseMarkdownSections]);

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
          <label className="text-xs text-gray-600">Formatted Text (paste from Google Docs or use ## markdown headings)</label>
          <div
            ref={formattedInputRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            className="w-full h-96 p-2 text-xs font-mono border border-gray-300 overflow-y-auto"
            onInput={(e) => setFormattedText(e.currentTarget.innerHTML)}
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

