'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useChordmarkParser, useChordmarkRenderer, CHORDMARK_STYLES } from './ChordmarkRenderer';
import ChordmarkPlayer from './ChordmarkPlayer';
import ChordButtons from '../chord-player/ChordButtons';
import { useLineHighlighting } from './useLineHighlighting';
import Link from 'next/link';

interface ChordmarkEditorProps {
  value: string;
  onChange: (value: string) => void;
  showSyntaxHelp?: boolean;
  bpm?: number;
  autosaveKey?: string;
  versionCreatedAt?: string;
}

type PreviewMode = 'full' | 'chords' | 'lyrics' | 'side-by-side';

type AutosaveSnapshot = {
  value: string;
  savedAt: string;
};

const ChordmarkEditor = ({ value, onChange, showSyntaxHelp = false, bpm, autosaveKey, versionCreatedAt }: ChordmarkEditorProps) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('full');
  const [currentLineIndex, setCurrentLineIndex] = useState<number | null>(null);
  const [pendingAutosave, setPendingAutosave] = useState<AutosaveSnapshot | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const autosaveStorageKey = `chordmark-editor:${autosaveKey || 'default'}`;

  const persistAutosaveSnapshot = useCallback((snapshot: AutosaveSnapshot) => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(autosaveStorageKey, JSON.stringify(snapshot));
    } catch {
      // ignore storage errors
    }
  }, [autosaveStorageKey]);

  const loadAutosaveSnapshot = useCallback((): AutosaveSnapshot | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const storedValue = window.localStorage.getItem(autosaveStorageKey);
      if (!storedValue) {
        return null;
      }
      return JSON.parse(storedValue) as AutosaveSnapshot;
    } catch {
      return null;
    }
  }, [autosaveStorageKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  const parsedSong = useChordmarkParser(debouncedValue);
  const renderedOutputs = useChordmarkRenderer(parsedSong.song);

  useEffect(() => {
    setError(parsedSong.error || renderedOutputs.renderError);
  }, [parsedSong.error, renderedOutputs.renderError]);

  useEffect(() => {
    const payload: AutosaveSnapshot = {
      value: debouncedValue,
      savedAt: new Date().toISOString(),
    };
    persistAutosaveSnapshot(payload);
  }, [debouncedValue, persistAutosaveSnapshot]);

  useEffect(() => {
    if (!versionCreatedAt) {
      setPendingAutosave(null);
      return;
    }
    const parsed = loadAutosaveSnapshot();
    if (!parsed?.savedAt) {
      setPendingAutosave(null);
      return;
    }
    const savedAtMs = new Date(parsed.savedAt).getTime();
    const createdAtMs = new Date(versionCreatedAt).getTime();
    if (Number.isNaN(savedAtMs) || Number.isNaN(createdAtMs)) {
      setPendingAutosave(null);
      return;
    }
    if (savedAtMs > createdAtMs && parsed.value !== value) {
      setPendingAutosave(parsed);
    } else {
      setPendingAutosave(null);
    }
  }, [versionCreatedAt, value, loadAutosaveSnapshot]);

  const handleRestoreAutosave = () => {
    if (!pendingAutosave) {
      return;
    }
    onChange(pendingAutosave.value);
    setPendingAutosave(null);
  };

  const handleDismissAutosave = () => {
    setPendingAutosave(null);
  };

  // Apply line highlighting to preview
  useLineHighlighting(previewRef, currentLineIndex);

  const getPreviewContent = () => {
    if (previewMode === 'side-by-side') {
      return null; // Side-by-side uses custom layout
    }
    
    switch (previewMode) {
      case 'chords':
        return renderedOutputs.htmlChordsOnly;
      case 'lyrics':
        return renderedOutputs.htmlLyricsOnly;
      case 'full':
      default:
        return renderedOutputs.htmlFull;
    }
  };

  const previewContent = getPreviewContent();

  return (
    <div className="space-y-2">
      <style dangerouslySetInnerHTML={{ __html: CHORDMARK_STYLES }} />
      
      {showSyntaxHelp && (
        <div className="p-2 text-xs">
          <div className="font-semibold mb-1">Chordmark Syntax:</div>
          <div className="space-y-0.5">
            <div><strong>Chords:</strong> Use bars <code>|C|G|Am|F|</code> or chord names <code>C G Am F</code></div>
            <div><strong>Lyrics:</strong> Plain text lines. Use <code>_</code> to align chords with lyrics</div>
            <div><strong>Sections:</strong> <code>#v</code> (verse), <code>#c</code> (chorus), <code>#b</code> (bridge), <code>#i</code> (intro), <code>#o</code> (outro)</div>
          </div>
          <div><Link href="https://chordmark.netlify.app/docs/reference/chords">Chordmark Syntax Documentation</Link></div>
        </div>
      )}

      {error && (
        <div className="p-2 bg-red-100 text-red-800 text-xs">
          {error}
        </div>
      )}

      {pendingAutosave && (
        <div className="flex items-center gap-4 p-2 text-xs ">
          <div onClick={handleRestoreAutosave} className="cursor-pointer">
            Restore changes from {new Date(pendingAutosave.savedAt).toLocaleString()}?
          </div>
          <div onClick={handleDismissAutosave} className="cursor-pointer text-gray-500">X</div>
        </div>
      )}

        <ChordmarkPlayer 
          parsedSong={parsedSong.song}
          onLineChange={setCurrentLineIndex}
          bpm={bpm}
        />

      <ChordButtons startCollapsed />

      <div className="flex gap-2">
        <div className="flex flex-col flex-1">
          <h3 className="text-xs font-semibold mb-1 text-gray-400">Chordmark Input</h3>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter chordmark notation..."
            className="flex-1 p-2 border bg-gray-800 text-sm font-mono min-h-[300px] whitespace-pre flex-grow flex-2"
            style={{ lineHeight: '16px', maxWidth: '800px' }}
          />
        </div>

        <div className="flex flex-col flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-400">Preview</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setPreviewMode('full')}
                className={`px-2 py-0.5 text-xs ${previewMode === 'full' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Full
              </button>
              <button
                onClick={() => setPreviewMode('side-by-side')}
                className={`px-2 py-0.5 text-xs ${previewMode === 'side-by-side' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Side-by-Side
              </button>
              <button
                onClick={() => setPreviewMode('chords')}
                className={`px-2 py-0.5 text-xs ${previewMode === 'chords' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Chords
              </button>
              <button
                onClick={() => setPreviewMode('lyrics')}
                className={`px-2 py-0.5 text-xs ${previewMode === 'lyrics' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Lyrics
              </button>
            </div>
          </div>
          <div ref={previewRef} className="flex-1 p-2 border overflow-auto text-xs font-mono">
            {previewMode === 'side-by-side' ? (
              renderedOutputs.htmlChordsOnly || renderedOutputs.htmlLyricsOnly ? (
                <div className="flex gap-4 h-full">
                  <div className="flex-0 min-w-0">
                    <div className="text-gray-400 mb-1 text-xs">Chords</div>
                    <div className="styled-chords" dangerouslySetInnerHTML={{ __html: renderedOutputs.htmlChordsOnly || '' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-400 mb-1 text-xs">Lyrics</div>
                    <div className="styled-chordmark" dangerouslySetInnerHTML={{ __html: renderedOutputs.htmlLyricsOnly || '' }} />
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">Enter chordmark to see preview</div>
              )
            ) : (
              <div className="styled-chordmark">
                {previewContent ? (
                  <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                ) : (
                  <div className="text-gray-400">Enter chordmark to see preview</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChordmarkEditor;

