import { lineTypes } from 'chord-mark';
import type { ParsedSong, ChordLine } from 'chord-mark';
import { Chord as TonalChord } from 'tonal';
import type { ChordEvent } from './types';

const isChordLine = (line: { type: string }): line is ChordLine => line.type === lineTypes.CHORD;

// Convert a chord symbol like "C", "Am7", "G/B" to piano notes in a good octave range
export const chordToNotes = (chordSymbol: string): string[] => {
  if (!chordSymbol || chordSymbol === 'NC' || chordSymbol === '%') return [];
  
  // Handle slash chords - use the bass note
  let symbol = chordSymbol;
  let bassNote: string | null = null;
  if (chordSymbol.includes('/')) {
    const parts = chordSymbol.split('/');
    symbol = parts[0];
    bassNote = parts[1];
  }
  
  const chord = TonalChord.get(symbol);
  if (!chord.notes || chord.notes.length === 0) {
    // Try with just the root if chord parsing fails
    const rootMatch = symbol.match(/^([A-G][#b]?)/);
    if (rootMatch) {
      // Return just the root as a power chord (root + fifth)
      const root = rootMatch[1];
      return [`${root}3`, `${root}4`];
    }
    return [];
  }
  
  // Place chord in a nice piano range (octave 3-4 for left hand, 4-5 for right)
  const notes: string[] = [];
  
  // Add bass note if present (lower octave)
  if (bassNote) {
    notes.push(`${bassNote}2`);
  }
  
  // Add chord notes - spread across octaves for nice voicing
  chord.notes.forEach((note, i) => {
    if (i === 0) {
      notes.push(`${note}3`); // Root in lower octave
    } else if (i < 3) {
      notes.push(`${note}4`); // First few extensions in middle
    } else {
      notes.push(`${note}5`); // Higher extensions
    }
  });
  
  return notes;
};

// Extract chord events with timing from a parsed song
export const extractChordEvents = (song: ParsedSong | null): ChordEvent[] => {
  if (!song?.allLines) return [];
  
  const events: ChordEvent[] = [];
  let currentBeat = 0;
  
  for (const line of song.allLines) {
    if (!isChordLine(line)) continue;
    
    const bars = line.model?.allBars || line.allBars || [];
    
    for (const bar of bars) {
      if (bar.isRepeated) {
        // Repeated bar - advance by time signature beats
        const beatsPerBar = bar.timeSignature?.count || 4;
        currentBeat += beatsPerBar;
        continue;
      }
      
      const chords = bar.allChords || [];
      const beatsPerBar = bar.timeSignature?.count || 4;
      
      if (chords.length === 0) {
        currentBeat += beatsPerBar;
        continue;
      }
      
      for (const chord of chords) {
        const chordSymbol = chord.string || '';
        if (!chordSymbol || chordSymbol === '%') {
          currentBeat += chord.duration || 1;
          continue;
        }
        
        const notes = chordToNotes(chordSymbol);
        if (notes.length > 0) {
          events.push({
            chordSymbol,
            notes,
            startBeat: currentBeat,
            durationBeats: chord.duration || 1,
          });
        }
        currentBeat += chord.duration || 1;
      }
    }
  }
  
  return events;
};








