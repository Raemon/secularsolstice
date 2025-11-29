'use client';

import { useMemo, useState } from 'react';
import ChevronArrow from '@/app/components/ChevronArrow';
import { usePianoPlayback } from '../chordmark-converter/usePianoPlayback';

interface ChordButtonsProps {
  startCollapsed?: boolean;
}

const ChordButtons = ({ startCollapsed = false }: ChordButtonsProps) => {
  const { playSingleChord, currentChord, isLoading } = usePianoPlayback();
  const [isCollapsed, setIsCollapsed] = useState(startCollapsed);

  const chordGroups = useMemo(() => {
    const roots = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb', 'B'];
    return [
      { label: 'Major:', chords: roots },
      { label: 'Minor:', chords: roots.map(r => `${r}m`) },
      { label: '5th:', chords: roots.map(r => `${r}5`) }
    ];
  }, []);

  const getButtonClass = (isActive: boolean, position: 'left' | 'center' | 'right') => {
    const baseClass = 'font-mono text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    const activeClass = isActive ? 'bg-gray-600 text-white border-gray-600' : 'bg-gray-500 hover:bg-gray-100 border-gray-300 text-gray-700';
    const borders = position === 'left' ? 'border-l border-t border-b' : position === 'right' ? 'border-r border-t border-b' : 'border';
    const padding = position === 'center' ? 'px-2 py-0.5' : 'px-1 py-0.5';
    const textColor = position === 'center' ? 'text-gray-400' : 'text-gray-700';
    const width = position === 'center' ? 'w-8' : 'w-5';
    return `${padding} ${borders} ${baseClass} ${activeClass} ${textColor} ${width}`;
  };

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={() => setIsCollapsed(!isCollapsed)} className="flex items-center gap-1 text-xs text-gray-600">
        <ChevronArrow isExpanded={!isCollapsed} />
        <span>Chord Palette</span>
      </button>
      {!isCollapsed && chordGroups.map(({ label, chords }) => (
        <div key={label} className="flex gap-1">
          <span className="w-12 text-gray-500 text-right pr-1">{label}</span>
          {chords.map((chord) => (
            <div key={chord} className="flex">
              <button onClick={() => playSingleChord(chord, -1)} disabled={isLoading} className={getButtonClass(currentChord === chord, 'left')} title="Low">-</button>
              <button onClick={() => playSingleChord(chord, 0)} disabled={isLoading} className={getButtonClass(currentChord === chord, 'center')}>{chord}</button>
              <button onClick={() => playSingleChord(chord, 1)} disabled={isLoading} className={getButtonClass(currentChord === chord, 'right')} title="High">+</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default ChordButtons;
