'use client';

import { useState, useEffect } from 'react';
import { serializeToChordmark, combineChordsAndLyrics } from './utils';
import { useChordmarkParser, useChordmarkRenderer, CHORDMARK_STYLES } from './ChordmarkRenderer';
import ChordmarkEditor from './ChordmarkEditor';

const ChordmarkConverter = () => {
  const [inputText, setInputText] = useState('');
  const [debouncedInputText, setDebouncedInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'detailed'>('editor');

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('chordmark-converter-input');
    if (saved) {
      setInputText(saved);
      setDebouncedInputText(saved);
    }
  }, []);

  // Save to localStorage when inputText changes
  useEffect(() => {
    if (inputText) {
      localStorage.setItem('chordmark-converter-input', inputText);
    }
  }, [inputText]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInputText(inputText);
    }, 500);

    return () => clearTimeout(timer);
  }, [inputText]);

  const parsedSong = useChordmarkParser(debouncedInputText);
  const baseOutputs = useChordmarkRenderer(parsedSong.song);

  const renderedOutputs = {
    ...baseOutputs,
    htmlChordsFirstLyricLine: baseOutputs.htmlFull ? (() => {
      try { return combineChordsAndLyrics(baseOutputs.htmlFull); } catch { return baseOutputs.htmlFull; }
    })() : '',
    plainText: parsedSong.song ? serializeToChordmark(parsedSong.song) : '',
  };

  useEffect(() => {
    setError(parsedSong.error || renderedOutputs.renderError);
  }, [parsedSong.error, renderedOutputs.renderError]);

  return (
    <div className="p-4">
      <style dangerouslySetInnerHTML={{ __html: CHORDMARK_STYLES }} />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl">Chordmark Converter</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('editor')}
            className={`px-3 py-1 text-xs ${viewMode === 'editor' ? 'bg-blue-600 text-white' : 'bg-gray-800'}`}
          >
            Editor View
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-3 py-1 text-xs ${viewMode === 'detailed' ? 'bg-blue-600 text-white' : 'bg-gray-800'}`}
          >
            Detailed View
          </button>
        </div>
      </div>

      {viewMode === 'editor' ? (
        <ChordmarkEditor
          value={inputText}
          onChange={setInputText}
          showSyntaxHelp={true}
          autosaveKey="converter"
        />
      ) : (
        <>
          <div className="mb-4 p-3 text-xs">
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

          <div className="flex gap-4">
            <div className="flex flex-col flex-1">
              <h2 className="text-sm font-semibold mb-2">Chordmark Input</h2>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter chordmark notation..."
                className="flex-1 p-2 border text-xs font-mono dark:bg-black"
                style={{ lineHeight: '16px' }}
                rows={20}
              />
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
              <div className="flex-1 p-2 border overflow-auto text-xs font-mono styled-chordmark">
                {renderedOutputs.htmlLyricsOnly ? (
                  <div dangerouslySetInnerHTML={{ __html: renderedOutputs.htmlLyricsOnly }} />
                ) : (
                  <div className="text-gray-400">Enter chordmark to see rendered output</div>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <h2 className="text-sm font-semibold mb-2">HTML (Full Chart)</h2>
              <div className="flex-1 p-2 border overflow-auto text-xs font-mono styled-chordmark">
                {renderedOutputs.htmlFull ? (
                  <div dangerouslySetInnerHTML={{ __html: renderedOutputs.htmlFull }} />
                ) : (
                  <div className="text-gray-400">Enter chordmark to see rendered output</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChordmarkConverter;