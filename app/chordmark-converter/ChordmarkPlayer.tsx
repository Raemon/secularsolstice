'use client';

import { useMemo, useEffect, useState } from 'react';
import type { ParsedSong } from 'chord-mark';
import { extractChordEvents } from './chordUtils';
import { useChordPlayback, type MetronomeMode } from './useChordPlayback';

interface ChordmarkPlayerProps {
  parsedSong: ParsedSong | null;
  onLineChange?: (lineIndex: number | null) => void;
  bpm?: number;
  onBpmChange?: (bpm: number) => void;
  startLine?: number;
  onStartLineChange?: (line: number) => void;
  autoPlay?: boolean;
  onAutoPlayComplete?: () => void;
  transposeSteps?: number;
}

const ChordmarkPlayer = ({
  parsedSong,
  onLineChange,
  bpm = 90,
  onBpmChange,
  startLine: controlledStartLine,
  onStartLineChange,
  autoPlay,
  onAutoPlayComplete,
  transposeSteps = 0,
}: ChordmarkPlayerProps) => {
  const chordEvents = useMemo(() => extractChordEvents(parsedSong, transposeSteps), [parsedSong, transposeSteps]);
  const hasChords = chordEvents.length > 0;
  const lineOptions = useMemo(() => {
    if (!parsedSong?.allLines) return [];
    return parsedSong.allLines.map((line, index) => {
      const trimmed = (line.string || '').trim();
      const label = trimmed === '' ? `[${line.type}]` : trimmed;
      return { value: index, label: `${index + 1}: ${label}` };
    });
  }, [parsedSong]);
  const [internalStartLine, setInternalStartLine] = useState(0);
  const startLine = controlledStartLine !== undefined ? controlledStartLine : internalStartLine;
  const [metronomeMode, setMetronomeMode] = useState<MetronomeMode>('4/4');
  const filteredChordEvents = useMemo(() => {
    if (chordEvents.length === 0) return [];
    const firstIndex = chordEvents.findIndex(event => event.lineIndex >= startLine);
    if (firstIndex === -1) return [];
    const startOffset = chordEvents[firstIndex].startBeat;
    return chordEvents.slice(firstIndex).map(event => ({
      ...event,
      startBeat: event.startBeat - startOffset,
    }));
  }, [chordEvents, startLine]);
  
  const {
    isPlaying,
    isLoading,
    currentChord,
    currentLineIndex,
    loadError,
    handlePlay,
    handleStop,
    setMetronomeMode: setPlaybackMetronomeMode,
  } = useChordPlayback(filteredChordEvents, bpm);
  
  // Notify parent of line changes
  useEffect(() => {
    if (onLineChange) {
      onLineChange(currentLineIndex);
    }
  }, [currentLineIndex, onLineChange]);
  
  useEffect(() => {
    setPlaybackMetronomeMode(metronomeMode);
  }, [metronomeMode, setPlaybackMetronomeMode]);
  
  useEffect(() => {
    if (autoPlay && !isPlaying && !isLoading) {
      handlePlay();
      if (onAutoPlayComplete) {
        onAutoPlayComplete();
      }
    }
  }, [autoPlay, isPlaying, isLoading, handlePlay, onAutoPlayComplete]);
  
  if (!hasChords) return null;
  
  return (
    <div className="flex flex-col gap-2 text-xs mb-2 border border-gray-500 rounded-sm p-2 mb-4">
      <div className="flex items-center gap-2">
        <button
          onClick={isPlaying ? handleStop : handlePlay}
          disabled={isLoading}
          className="px-2 py-0.5 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? '...' : isPlaying ? '■' : '▶'}
        </button>
        {onBpmChange ? (
          <div className="flex items-center gap-1">
            <span className="text-gray-500">BPM:</span>
            <input
              type="number"
              value={bpm}
              onChange={(e) => onBpmChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 px-1 py-1 rounded-sm border border-gray-300 bg-transparent text-gray-100"
              min="1"
              max="500"
            />
          </div>
        ) : (
          <span className="text-gray-500">BPM: {bpm}</span>
        )}
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Tick:</span>
          <select
            value={metronomeMode}
            onChange={(e) => setMetronomeMode(e.target.value as MetronomeMode)}
            className="p-1 rounded-sm border border-gray-500 text-gray-200 bg-black"
          >
            <option value="off">Off</option>
            <option value="2/4">2/4</option>
            <option value="3/4">3/4</option>
            <option value="4/4">4/4</option>
            <option value="6/4">6/4</option>
            <option value="quarter">Quarter</option>
            <option value="triplet">Triplet</option>
          </select>
        </div>
        {currentChord && <span className="text-blue-400 font-medium">{currentChord}</span>}
        {loadError && <span className="text-red-600">{loadError}</span>}
      </div>
    </div>
  );
};

export default ChordmarkPlayer;
