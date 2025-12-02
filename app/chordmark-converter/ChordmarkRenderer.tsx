'use client';

import { useState, useMemo, useRef } from 'react';
import { parseSong, renderSong } from 'chord-mark';
import { extractTextFromHTML, convertCustomFormatToChordmark, prepareSongForRendering, prepareSongForChordsWithMeta, removeRepeatBarIndicators, isBracketedMetaLine } from './utils';
import ChordmarkPlayer from './ChordmarkPlayer';
import { useLineHighlighting } from './useLineHighlighting';
import { generateSlidesFromChordmark } from '../../src/components/slides/slideGenerators';
import TransposeControls from './TransposeControls';
import ChordmarkContent from './ChordmarkContent';

export type ChordmarkViewMode = 'lyrics+chords' | 'lyrics' | 'chords' | 'one-line' | 'slides' | 'raw';

export const CHORDMARK_STYLES = `
  .styled-chords .cmSong {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: pre;
    font-variant-ligatures: none;
  }
  .styled-chords .cmSong * {
    font-family: inherit;
    white-space: inherit;
  }
  .styled-chords .cmSong p {
    margin: 0;
    line-height: 16px;
  }
  .styled-chords .cmSong p + p {
  }
  .styled-chordmark .cmSong {
    max-width:  800px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: pre;
    font-variant-ligatures: none;
  }
  .styled-chordmark .cmSong * {
    font-family: inherit;
    white-space: inherit;
  }
  .styled-chordmark .cmSong p {
    margin: 0;
    line-height: 16px;
  }
  .styled-chordmark .cmSong p + p {
  }
  .styled-chordmark .cmSong .cmLine,
  .styled-chordmark .cmSong .cmChordLine,
  .styled-chordmark .cmSong .cmLyricLine,
  .styled-chordmark .cmSong .cmChordLyricLine,
  .styled-chordmark .cmSong .cmSectionLabel,
  .styled-chordmark .cmSong .cmEmptyLine {
    display: block;
    line-height: 16px;
  }
  .styled-chordmark .cmSong .cmChordLyricPair {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15em;
  }
  .styled-chordmark .cmSong .cmChordLineOffset,
  .styled-chordmark .cmSong .cmChordSymbol,
  .styled-chordmark .cmSong .cmChordDuration,
  .styled-chordmark .cmSong .cmBarSeparator,
  .styled-chordmark .cmSong .cmTimeSignature,
  .styled-chordmark .cmSong .cmSubBeatGroupOpener,
  .styled-chordmark .cmSong .cmSubBeatGroupCloser {
    white-space: inherit;
    color: #aaa;
  }
  .styled-chordmark .cmSong .cmLyricLine,
  .styled-chordmark .cmSong .cmLyric {

  }
  .styled-chordmark .cmSong .cmSectionLabel {
    font-weight: 600;
  }
  .styled-chordmark .cmSong .cmEmptyLine {
    min-height: 0.5em;
  }
  .styled-chordmark .cmSong .cmBracketMeta {
    color: #888;
    font-style: italic;
    max-width: 400px;
    display: inline-block;
    width: 300px;
    white-space: pre-wrap;
  }
  .styled-chords .cmSong .cmBracketMeta {
    color: #888;
    font-style: italic;
    max-width: 400px;
    display: inline-block;
    white-space: pre-wrap;
    width: 300px;
  }
  
  /* Line highlighting for active playback - only chord lines get data-line-index */
  .styled-chordmark .cmSong .cmChordLine[data-line-active="true"],
  .styled-chordmark .cmSong .cmChordLyricLine[data-line-active="true"] {
    background-color: #fef3c7;
    border-radius: 2px;
    padding: 0 2px;
    margin: 0 -2px;
  }
  .styled-chords .cmSong .cmChordLine[data-line-active="true"],
  .styled-chords .cmSong .cmChordLyricLine[data-line-active="true"] {
    background-color: #fef3c7;
    border-radius: 2px;
    padding: 0 2px;
    margin: 0 -2px;
  }
`;

export const useChordmarkParser = (content: string) => {
  return useMemo<{ song: ReturnType<typeof parseSong> | null; error: string | null }>(() => {
    if (!content.trim()) {
      return { song: null, error: null };
    }

    try {
      let textToParse = content.trim();
      
      if (textToParse.startsWith('<') && textToParse.includes('>')) {
        textToParse = extractTextFromHTML(textToParse);
      }

      if (!textToParse) {
        return { song: null, error: null };
      }

      try {
        const parsed = parseSong(textToParse);
        return { song: removeRepeatBarIndicators(parsed), error: null };
      } catch (parseErr) {
        const firstError = parseErr instanceof Error ? parseErr.message : 'Unknown parsing error';
        const customResult = convertCustomFormatToChordmark(textToParse);
        if (customResult !== textToParse) {
          try {
            const parsedCustom = parseSong(customResult);
            return { song: removeRepeatBarIndicators(parsedCustom), error: null };
          } catch (customErr) {
            const customError = customErr instanceof Error ? customErr.message : 'Unknown parsing error';
            return { song: null, error: `Could not parse input. Original error: ${firstError}. After format conversion: ${customError}` };
          }
        }
        return { song: null, error: `Could not parse input as valid chordmark: ${firstError}` };
      }
    } catch (err) {
      return { song: null, error: err instanceof Error ? err.message : 'An error occurred during parsing' };
    }
  }, [content]);
};

let sharedDomParser: DOMParser | null = null;

const getDomParser = () => {
  if (sharedDomParser) {
    return sharedDomParser;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  sharedDomParser = new DOMParser();
  return sharedDomParser;
};

const buildChordLineIndices = (parsedSong: ReturnType<typeof parseSong> | null): number[] => {
  if (!parsedSong?.allLines) {
    return [];
  }
  const indices: number[] = [];
  for (let i = 0; i < parsedSong.allLines.length; i++) {
    if (parsedSong.allLines[i].type === 'chord') {
      indices.push(i);
    }
  }
  return indices;
};

// Helper to add line index data attributes to rendered HTML
const addLineIndexAttributes = (html: string, chordLineIndices: number[]): string => {
  if (!html || chordLineIndices.length === 0) return html;
  
  const parser = getDomParser();
  if (!parser) {
    return html;
  }
  const doc = parser.parseFromString(html, 'text/html');
  
  // Get chord line elements only - these are the only ones we want to highlight
  const chordLineElements = doc.querySelectorAll('.cmChordLine, .cmChordLyricLine');
  
  // Map rendered chord elements to their source line indices
  // This assumes chord lines are rendered in order
  chordLineElements.forEach((element, renderIndex) => {
    if (renderIndex < chordLineIndices.length) {
      element.setAttribute('data-line-index', String(chordLineIndices[renderIndex]));
    }
  });
  
  return doc.body.innerHTML;
};

// Helper to add CSS class to bracket meta lines
const addBracketMetaClasses = (html: string, parsedSong: ReturnType<typeof parseSong> | null): string => {
  if (!html || !parsedSong?.allLines) return html;
  
  const parser = getDomParser();
  if (!parser) {
    return html;
  }
  const doc = parser.parseFromString(html, 'text/html');
  
  // Find all lyric line elements
  const lyricElements = doc.querySelectorAll('.cmLyricLine');
  
  // Track which lyric lines in the rendered output correspond to bracket meta lines
  let lyricIndex = 0;
  lyricElements.forEach((element) => {
    // Find the corresponding line in the parsed song
    while (lyricIndex < parsedSong.allLines.length) {
      const line = parsedSong.allLines[lyricIndex];
      if (line.type === 'lyric') {
        if (isBracketedMetaLine(line)) {
          element.classList.add('cmBracketMeta');
        }
        lyricIndex++;
        break;
      }
      lyricIndex++;
    }
  });
  
  return doc.body.innerHTML;
};

export const useChordmarkRenderer = (parsedSong: ReturnType<typeof parseSong> | null, transposeValue: number = 0) => {
  const songForRendering = useMemo(() => {
    if (!parsedSong) return null;
    return prepareSongForRendering(parsedSong);
  }, [parsedSong]);

  const songForChordsWithMeta = useMemo(() => {
    if (!parsedSong) return null;
    return prepareSongForChordsWithMeta(parsedSong);
  }, [parsedSong]);

  const chordLineIndices = useMemo(() => buildChordLineIndices(parsedSong), [parsedSong]);

  return useMemo(() => {
    if (!songForRendering) {
      return { htmlFull: '', htmlChordsOnly: '', htmlLyricsOnly: '', renderError: null };
    }

    try {
      let htmlFull = renderSong(songForRendering, { chartType: 'all', accidentalsType: 'auto', transposeValue });
      let htmlChordsOnly = songForChordsWithMeta 
        ? renderSong(songForChordsWithMeta, { chartType: 'all', alignChordsWithLyrics: false, accidentalsType: 'auto', transposeValue })
        : renderSong(songForRendering, { chartType: 'chords', alignChordsWithLyrics: false, accidentalsType: 'auto', transposeValue });
      let htmlLyricsOnly = renderSong(songForRendering, { chartType: 'lyrics', accidentalsType: 'auto', transposeValue });

      // Add line index attributes for highlighting
      htmlFull = addLineIndexAttributes(htmlFull, chordLineIndices);
      htmlChordsOnly = addLineIndexAttributes(htmlChordsOnly, chordLineIndices);
      htmlLyricsOnly = addLineIndexAttributes(htmlLyricsOnly, chordLineIndices);

      // Add bracket meta classes - use the correct source song for each render
      htmlFull = addBracketMetaClasses(htmlFull, parsedSong);
      htmlChordsOnly = addBracketMetaClasses(htmlChordsOnly, songForChordsWithMeta || parsedSong);
      htmlLyricsOnly = addBracketMetaClasses(htmlLyricsOnly, parsedSong);

      return { htmlFull, htmlChordsOnly, htmlLyricsOnly, renderError: null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred during rendering';
      return { htmlFull: '', htmlChordsOnly: '', htmlLyricsOnly: '', renderError: errorMsg };
    }
  }, [songForRendering, songForChordsWithMeta, chordLineIndices, parsedSong, transposeValue]);
};

const ChordmarkTabs = ({mode, onModeChange}: {mode: ChordmarkViewMode, onModeChange: (mode: ChordmarkViewMode) => void}) => {
  const tabs: {id: ChordmarkViewMode, label: string}[] = [
    { id: 'lyrics+chords', label: 'Lyrics + Chords' },
    { id: 'lyrics', label: 'Lyrics' },
    { id: 'chords', label: 'Chords' },
    { id: 'one-line', label: 'Side-by-Side' },
    { id: 'slides', label: 'Slides' },
    { id: 'raw', label: 'Raw' },
  ];

  return (
    <div className="flex gap-1">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onModeChange(tab.id)}
          className={`px-2 py-0.5 text-xs ${mode === tab.id ? 'font-medium' : 'text-gray-500'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

const ChordmarkRenderer = ({
  content,
  defaultMode = 'one-line',
  activeLineIndex = null,
  initialBpm = 90,
  print = false,
  renderedContent = null,
}: {
  content: string;
  defaultMode?: ChordmarkViewMode;
  activeLineIndex?: number | null;
  initialBpm?: number;
  print?: boolean;
  renderedContent?: {htmlFull?: string; htmlChordsOnly?: string; htmlLyricsOnly?: string; slides?: string; [key: string]: string | undefined} | null;
}) => {
  const [mode, setMode] = useState<ChordmarkViewMode>(defaultMode);
  const [transposeSteps, setTransposeSteps] = useState(0);
  
  // Always parse for the player, but only render if we don't have cached content
  const parsedSong = useChordmarkParser(content);
  const shouldUseCachedContent = Boolean(renderedContent) && transposeSteps === 0;
  const renderedOutputs = useChordmarkRenderer(shouldUseCachedContent ? null : parsedSong.song, transposeSteps);
  
  // Always generate slides client-side (they're cheap and can't be generated server-side easily)
  const slides = useMemo(() => {
    if (!content || !content.trim()) return [];
    return generateSlidesFromChordmark(content, { linesPerSlide: 10 });
  }, [content]);
  
  // Use cached content if available
  const finalOutputs = useMemo(() => {
    if (shouldUseCachedContent && renderedContent) {
      console.log('[ChordmarkRenderer] Using cached rendered content');
      return {
        htmlFull: renderedContent.htmlFull || '',
        htmlChordsOnly: renderedContent.htmlChordsOnly || '',
        htmlLyricsOnly: renderedContent.htmlLyricsOnly || '',
        slides,
        renderError: null,
      };
    }
    return {
      ...renderedOutputs,
      slides,
    };
  }, [renderedContent, renderedOutputs, slides, shouldUseCachedContent]);
  
  const [currentLineIndex, setCurrentLineIndex] = useState<number | null>(null);
  const [bpm, setBpm] = useState<number>(initialBpm);
  const [playerStartLine, setPlayerStartLine] = useState(0);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const isSideBySide = mode === 'one-line';

  const contentRef = useRef<HTMLDivElement>(null);

  const error = parsedSong.error || finalOutputs.renderError;

  const handlePlayFromLine = (lineIndex: number) => {
    setPlayerStartLine(lineIndex);
    setShouldAutoPlay(true);
  };

  // Apply line highlighting
  const lineToHighlight = activeLineIndex ?? currentLineIndex;
  useLineHighlighting(contentRef, lineToHighlight);

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: CHORDMARK_STYLES }} />
      {!print && <ChordmarkPlayer 
        parsedSong={parsedSong.song} 
        onLineChange={setCurrentLineIndex}
        bpm={bpm}
        onBpmChange={setBpm}
        startLine={playerStartLine}
        onStartLineChange={setPlayerStartLine}
        autoPlay={shouldAutoPlay}
        onAutoPlayComplete={() => setShouldAutoPlay(false)}
      />}
      {error && mode !== 'raw' && (
        <div className="mb-2 p-1 bg-red-100 text-red-800 text-xs">{error}</div>
      )}
      <div className="flex items-center justify-between mb-2">
        <ChordmarkTabs mode={mode} onModeChange={setMode} />
        <TransposeControls value={transposeSteps} onChange={setTransposeSteps} />
      </div>
      <div className="flex relative" style={{ maxWidth: isSideBySide ? 'none' : '800px' }}>
        {!print && <div className="flex flex-col bg-gray-900 border-r border-gray-700">
          {content.split('\n').map((_, index) => (
            <div
              key={index}
              className="relative group flex items-center"
              style={{ height: '16px', lineHeight: '16px' }}
            >
              <button
                onClick={() => handlePlayFromLine(index)}
                className="absolute left-0 opacity-0 group-hover:opacity-100 transition-opacity px-1 text-blue-400 hover:text-blue-300 text-xs"
                title={`Play from line ${index + 1}`}
                style={{ fontSize: '10px' }}
              >
                ▶
              </button>
              <span className="text-gray-500 text-xs pr-1 pl-5 select-none" style={{ fontSize: '10px', minWidth: '40px', textAlign: 'right' }}>
                {index + 1}
              </span>
            </div>
          ))}
        </div>}
        <div ref={contentRef} className="text-gray-200 p-2 flex-1">
          <ChordmarkContent error={error} content={content} mode={mode} finalOutputs={finalOutputs} />
        </div>
      </div>
    </div>
  );
};

export default ChordmarkRenderer;

