'use client';

import { useMemo, useEffect, useState } from 'react';
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
  const lineOptions = useMemo(() => {
    if (!parsedSong?.allLines) return [];
    return parsedSong.allLines.map((line, index) => {
      const trimmed = (line.string || '').trim();
      const label = trimmed === '' ? `[${line.type}]` : trimmed;
      return { value: index, label: `${index + 1}: ${label}` };
    });
  }, [parsedSong]);
  const [startLine, setStartLine] = useState(0);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
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
  
  const playbackControls = useChordPlayback(filteredChordEvents, bpm) as ReturnType<typeof useChordPlayback> & {
    setMetronomeEnabled: (enabled: boolean) => void;
  };
  const {
    isPlaying,
    isLoading,
    currentChord,
    currentLineIndex,
    loadError,
    handlePlay,
    handleStop,
    setMetronomeEnabled: setPlaybackMetronomeEnabled,
  } = playbackControls;
  
  // Notify parent of line changes
  useEffect(() => {
    if (onLineChange) {
      onLineChange(currentLineIndex);
    }
  }, [currentLineIndex, onLineChange]);
  
  useEffect(() => {
    setPlaybackMetronomeEnabled(metronomeEnabled);
  }, [metronomeEnabled, setPlaybackMetronomeEnabled]);
  
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
          <span className="text-gray-500">Start line:</span>
          <select
            value={String(startLine)}
            onChange={(e) => setStartLine(Number(e.target.value))}
            className="p-1 rounded-sm border border-gray-500 text-gray-200 bg-gray-800 max-w-xs"
            disabled={lineOptions.length === 0}
          >
            {lineOptions.map(option => (
              <option key={option.value} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-1 text-gray-500">
          <input
            type="checkbox"
            checked={metronomeEnabled}
            onChange={(e) => setMetronomeEnabled(e.target.checked)}
          />
          Tick
        </label>
        {currentChord && <span className="text-blue-600 font-medium">{currentChord}</span>}
        {loadError && <span className="text-red-600">{loadError}</span>}
      </div>
    </div>
  );
};

export default ChordmarkPlayer;
