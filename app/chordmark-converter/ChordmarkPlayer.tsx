'use client';

import { useMemo, useEffect } from 'react';
import type { ParsedSong } from 'chord-mark';
import { extractChordEvents } from './chordUtils';
import { useChordPlayback } from './useChordPlayback';

interface ChordmarkPlayerProps {
  parsedSong: ParsedSong | null;
  onLineChange?: (lineIndex: number | null) => void;
  bpm?: number;
  onBpmChange?: (bpm: number) => void;
}

const ChordmarkPlayer = ({
  parsedSong,
  onLineChange,
  bpm = 90,
  onBpmChange,
}: ChordmarkPlayerProps) => {
  const chordEvents = useMemo(() => extractChordEvents(parsedSong), [parsedSong]);
  const hasChords = chordEvents.length > 0;
  
  const {
    isPlaying,
    isLoading,
    currentChord,
    currentLineIndex,
    loadError,
    handlePlay,
    handleStop,
  } = useChordPlayback(chordEvents, bpm);
  
  // Notify parent of line changes
  useEffect(() => {
    if (onLineChange) {
      onLineChange(currentLineIndex);
    }
  }, [currentLineIndex, onLineChange]);
  
  if (!hasChords) return null;
  
  return (
    <div className="flex flex-col gap-2 text-xs mb-2">
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
              className="w-12 px-1 border border-gray-300 text-gray-900"
              min="1"
              max="300"
            />
          </div>
        ) : (
          <span className="text-gray-500">BPM: {bpm}</span>
        )}
        {currentChord && <span className="text-blue-600 font-medium">{currentChord}</span>}
        {loadError && <span className="text-red-600">{loadError}</span>}
      </div>
    </div>
  );
};

export default ChordmarkPlayer;
