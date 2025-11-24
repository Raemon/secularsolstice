'use client';

import { useState, useMemo, useEffect } from 'react';
import { parseSong, renderSong } from 'chord-mark';
import { extractTextFromHTML, convertCustomFormatToChordmark, serializeToChordmark, combineChordsAndLyrics } from './utils';

const ChordmarkConverter = () => {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const parsedSong = useMemo<{ song: ReturnType<typeof parseSong> | null; error: string | null }>(() => {
    if (!inputText.trim()) {
      return { song: null, error: null };
    }

    try {
      let textToParse = inputText.trim();
      
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
  }, [inputText]);

  const renderedOutputs = useMemo(() => {
    if (!parsedSong.song) {
      return {
        htmlFull: '',
        htmlChordsOnly: '',
        htmlLyricsOnly: '',
        htmlChordsFirstLyricLine: '',
        plainText: '',
        renderError: null,
      };
    }

    try {
      const htmlFull = renderSong(parsedSong.song, { chartType: 'all' });
      const htmlChordsOnly = renderSong(parsedSong.song, { chartType: 'chords' });
      const htmlLyricsOnly = renderSong(parsedSong.song, { chartType: 'lyrics' });
      let htmlChordsFirstLyricLine = '';
      try {
        htmlChordsFirstLyricLine = combineChordsAndLyrics(htmlFull);
      } catch {
        htmlChordsFirstLyricLine = htmlFull;
      }
      const plainText = serializeToChordmark(parsedSong.song);

      return {
        htmlFull,
        htmlChordsOnly,
        htmlLyricsOnly,
        htmlChordsFirstLyricLine,
        plainText,
        renderError: null,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred during rendering';
      return {
        htmlFull: '',
        htmlChordsOnly: '',
        htmlLyricsOnly: '',
        htmlChordsFirstLyricLine: '',
        plainText: serializeToChordmark(parsedSong.song),
        renderError: errorMsg,
      };
    }
  }, [parsedSong]);

  useEffect(() => {
    setError(parsedSong.error || renderedOutputs.renderError);
  }, [parsedSong.error, renderedOutputs.renderError]);

  return (
    <div className="p-4">
      <style dangerouslySetInnerHTML={{__html: `
        .cmSong {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .cmSong p {
          margin: 0;
          line-height: 1.2;
        }
        .cmSong p + p {
          margin-top: 0.25em;
        }
        .cmSong .cmChordLine,
        .cmSong .cmLyricLine,
        .cmSong .cmChordLyricLine {
          white-space: pre;
          display: block;
        }
        .cmSong .cmChordLyricPair {
          display: block;
        }
      `}} />
      <h1 className="text-xl mb-4">Chordmark Converter</h1>
      
      <div className="mb-4 p-3 bg-gray-50 text-xs">
        <div className="font-semibold mb-2">Chordmark Syntax:</div>
        <div className="space-y-1">
          <div><strong>Chords:</strong> Use bars <code>|C|G|Am|F|</code> or chord names <code>C G Am F</code></div>
          <div><strong>Lyrics:</strong> Plain text lines. Use <code>_</code> to align chords with lyrics</div>
          <div><strong>Sections:</strong> <code>#v</code> (verse), <code>#c</code> (chorus), <code>#b</code> (bridge), <code>#i</code> (intro), <code>#o</code> (outro). Use <code>#v2</code> for numbered sections, <code>#c x2</code> for repetition</div>
          <div><strong>Key:</strong> <code>{'{key: C}'}</code> or <code>{'{key: Am}'}</code></div>
          <div><strong>Time signature:</strong> <code>4/4</code>, <code>3/4</code>, etc.</div>
          <div><strong>Comments:</strong> Lines starting with <code>#</code> that aren&apos;t section labels are ignored during rendering</div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold mb-2">Chordmark Input</h2>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter chordmark notation..."
            className="flex-1 p-2 border text-xs font-mono"
            rows={20}
          />
        </div>

        <div className="flex flex-col">
          <h2 className="text-sm font-semibold mb-2">HTML (Full Chart)</h2>
          <div className="flex-1 p-2 border overflow-auto text-xs font-mono">
            {renderedOutputs.htmlFull ? (
              <div dangerouslySetInnerHTML={{ __html: renderedOutputs.htmlFull }} />
            ) : (
              <div className="text-gray-400">Enter chordmark to see rendered output</div>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <h2 className="text-sm font-semibold mb-2">HTML (Chords Only)</h2>
          <div className="flex-1 p-2 border overflow-auto text-xs font-mono">
            {renderedOutputs.htmlChordsOnly ? (
              <div dangerouslySetInnerHTML={{ __html: renderedOutputs.htmlChordsOnly }} />
            ) : (
              <div className="text-gray-400">Enter chordmark to see rendered output</div>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <h2 className="text-sm font-semibold mb-2">HTML (Lyrics Only)</h2>
          <div className="flex-1 p-2 border overflow-auto text-xs font-mono">
            {renderedOutputs.htmlLyricsOnly ? (
              <div dangerouslySetInnerHTML={{ __html: renderedOutputs.htmlLyricsOnly }} />
            ) : (
              <div className="text-gray-400">Enter chordmark to see rendered output</div>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <h2 className="text-sm font-semibold mb-2">HTML (Chords + Lyrics Same Line)</h2>
          <div className="flex-1 p-2 border overflow-auto text-xs font-mono">
            {renderedOutputs.htmlChordsFirstLyricLine ? (
              <div dangerouslySetInnerHTML={{ __html: renderedOutputs.htmlChordsFirstLyricLine }} />
            ) : (
              <div className="text-gray-400">Enter chordmark to see rendered output</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChordmarkConverter;