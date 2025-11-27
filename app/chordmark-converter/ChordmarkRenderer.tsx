'use client';

import { useState, useMemo, useRef } from 'react';
import { parseSong, renderSong } from 'chord-mark';
import { extractTextFromHTML, convertCustomFormatToChordmark, prepareSongForRendering, prepareSongForChordsWithMeta } from './utils';
import ChordmarkPlayer from './ChordmarkPlayer';
import { useLineHighlighting } from './useLineHighlighting';

export type ChordmarkViewMode = 'lyrics+chords' | 'lyrics' | 'chords' | 'one-line' | 'raw';

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
    line-height: 1.2;
  }
  .styled-chords .cmSong p + p {
    margin-top: 0.25em;
  }
  .styled-chordmark .cmSong {
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
    line-height: 1.2;
  }
  .styled-chordmark .cmSong p + p {
    margin-top: 0.25em;
  }
  .styled-chordmark .cmSong .cmLine,
  .styled-chordmark .cmSong .cmChordLine,
  .styled-chordmark .cmSong .cmLyricLine,
  .styled-chordmark .cmSong .cmChordLyricLine,
  .styled-chordmark .cmSong .cmSectionLabel,
  .styled-chordmark .cmSong .cmEmptyLine {
    display: block;
  }
  .styled-chordmark .cmSong .cmChordLyricPair {
    display: inline-flex;
    gap: 1ch;
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
    color: #000;
  }
  .styled-chordmark .cmSong .cmSectionLabel {
    font-weight: 600;
  }
  .styled-chordmark .cmSong .cmEmptyLine {
    min-height: 0.5em;
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
        return { song: parseSong(textToParse), error: null };
      } catch {
        const customResult = convertCustomFormatToChordmark(textToParse);
        if (customResult !== textToParse) {
          try {
            return { song: parseSong(customResult), error: null };
          } catch {
            return { song: null, error: 'Could not parse input as valid chordmark' };
          }
        }
        return { song: null, error: 'Could not parse input as valid chordmark' };
      }
    } catch (err) {
      return { song: null, error: err instanceof Error ? err.message : 'An error occurred during parsing' };
    }
  }, [content]);
};

// Helper to add line index data attributes to rendered HTML
const addLineIndexAttributes = (html: string, parsedSong: ReturnType<typeof parseSong> | null): string => {
  if (!html || !parsedSong?.allLines) return html;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Get chord line elements only - these are the only ones we want to highlight
  const chordLineElements = doc.querySelectorAll('.cmChordLine, .cmChordLyricLine');
  
  // Build a list of source line indices that have chords
  const chordLineIndices: number[] = [];
  for (let i = 0; i < parsedSong.allLines.length; i++) {
    if (parsedSong.allLines[i].type === 'chord') {
      chordLineIndices.push(i);
    }
  }
  
  // Map rendered chord elements to their source line indices
  // This assumes chord lines are rendered in order
  chordLineElements.forEach((element, renderIndex) => {
    if (renderIndex < chordLineIndices.length) {
      element.setAttribute('data-line-index', String(chordLineIndices[renderIndex]));
    }
  });
  
  return doc.body.innerHTML;
};

export const useChordmarkRenderer = (parsedSong: ReturnType<typeof parseSong> | null) => {
  const songForRendering = useMemo(() => {
    if (!parsedSong) return null;
    return prepareSongForRendering(parsedSong);
  }, [parsedSong]);

  const songForChordsWithMeta = useMemo(() => {
    if (!parsedSong) return null;
    return prepareSongForChordsWithMeta(parsedSong);
  }, [parsedSong]);

  return useMemo(() => {
    if (!songForRendering) {
      return { htmlFull: '', htmlChordsOnly: '', htmlLyricsOnly: '', renderError: null };
    }

    try {
      let htmlFull = renderSong(songForRendering, { chartType: 'all' });
      let htmlChordsOnly = songForChordsWithMeta 
        ? renderSong(songForChordsWithMeta, { chartType: 'all', alignChordsWithLyrics: false })
        : renderSong(songForRendering, { chartType: 'chords', alignChordsWithLyrics: false });
      let htmlLyricsOnly = renderSong(songForRendering, { chartType: 'lyrics' });

      // Add line index attributes for highlighting
      htmlFull = addLineIndexAttributes(htmlFull, parsedSong);
      htmlChordsOnly = addLineIndexAttributes(htmlChordsOnly, parsedSong);
      htmlLyricsOnly = addLineIndexAttributes(htmlLyricsOnly, parsedSong);

      return { htmlFull, htmlChordsOnly, htmlLyricsOnly, renderError: null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred during rendering';
      return { htmlFull: '', htmlChordsOnly: '', htmlLyricsOnly: '', renderError: errorMsg };
    }
  }, [songForRendering, songForChordsWithMeta, parsedSong]);
};

const ChordmarkTabs = ({mode, onModeChange}: {mode: ChordmarkViewMode, onModeChange: (mode: ChordmarkViewMode) => void}) => {
  const tabs: {id: ChordmarkViewMode, label: string}[] = [
    { id: 'lyrics+chords', label: 'Lyrics + Chords' },
    { id: 'lyrics', label: 'Lyrics' },
    { id: 'chords', label: 'Chords' },
    { id: 'one-line', label: 'Side-by-Side' },
    { id: 'raw', label: 'Raw' },
  ];

  return (
    <div className="flex gap-1 mb-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onModeChange(tab.id)}
          className={`px-2 py-0.5 text-xs ${mode === tab.id ? 'bg-gray-200 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
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
  showTabs = true,
  activeLineIndex = null,
  initialBpm = 90,
}: {
  content: string;
  defaultMode?: ChordmarkViewMode;
  showTabs?: boolean;
  activeLineIndex?: number | null;
  initialBpm?: number;
}) => {
  const [mode, setMode] = useState<ChordmarkViewMode>(defaultMode);
  const parsedSong = useChordmarkParser(content);
  const renderedOutputs = useChordmarkRenderer(parsedSong.song);
  const [currentLineIndex, setCurrentLineIndex] = useState<number | null>(null);
  const [bpm, setBpm] = useState<number>(initialBpm);

  const contentRef = useRef<HTMLDivElement>(null);

  const error = parsedSong.error || renderedOutputs.renderError;

  // Apply line highlighting
  const lineToHighlight = activeLineIndex ?? currentLineIndex;
  useLineHighlighting(contentRef, lineToHighlight);

  const renderContent = () => {
    if (error) {
      return <pre className="text-xs font-mono whitespace-pre-wrap">{content}</pre>;
    }
    
    if (mode === 'raw') {
      return <pre className="text-xs font-mono whitespace-pre-wrap">{content}</pre>;
    }

    // Side-by-side view: chords on left, lyrics on right
    if (mode === 'one-line') {
      if (!renderedOutputs.htmlChordsOnly && !renderedOutputs.htmlLyricsOnly) {
        return <pre className="text-xs font-mono whitespace-pre-wrap">{content}</pre>;
      }
      return (
        <div className="flex gap-4">
          <div className="flex-0 min-w-0">
            <div className="text-gray-400 mb-1">Chords</div>
            <div className="styled-chords text-xs font-mono" dangerouslySetInnerHTML={{ __html: renderedOutputs.htmlChordsOnly }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-gray-400 mb-1">Lyrics</div>
            <div className="styled-chordmark font-mono text-xs" dangerouslySetInnerHTML={{ __html: renderedOutputs.htmlLyricsOnly }} />
          </div>
        </div>
      );
    }

    let html = '';
    if (mode === 'lyrics+chords') {
      html = renderedOutputs.htmlFull;
    } else if (mode === 'lyrics') {
      html = renderedOutputs.htmlLyricsOnly;
    } else if (mode === 'chords') {
      html = renderedOutputs.htmlChordsOnly;
    }

    if (!html) {
      return <pre className="text-xs font-mono whitespace-pre-wrap">{content}</pre>;
    }

    // Don't apply CSS styling for chords-only mode
    if (mode === 'chords') {
      return <div className="text-xs font-mono" dangerouslySetInnerHTML={{ __html: html }} />;
    }

    return <div className="styled-chordmark text-xs" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: CHORDMARK_STYLES }} />
      {showTabs && <ChordmarkTabs mode={mode} onModeChange={setMode} />}
      <ChordmarkPlayer 
        parsedSong={parsedSong.song} 
        onLineChange={setCurrentLineIndex}
        bpm={bpm}
        onBpmChange={setBpm}
      />
      {error && mode !== 'raw' && (
        <div className="mb-2 p-1 bg-red-100 text-red-800 text-xs">{error}</div>
      )}
      <div ref={contentRef}>
        {renderContent()}
      </div>
    </div>
  );
};

export default ChordmarkRenderer;

