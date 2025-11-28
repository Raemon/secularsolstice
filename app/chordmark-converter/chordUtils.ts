import { lineTypes } from 'chord-mark';
import type { ParsedSong, ChordLine } from 'chord-mark';
import { Chord, Note } from 'tonal';
import type { ChordEvent } from './types';

const isChordLine = (line: { type: string }): line is ChordLine => line.type === lineTypes.CHORD;

// Convert a chord symbol like "C", "Am7", "G/B" to piano notes in a good octave range
export const chordToNotes = (chordSymbol: string, octaveOffset: number = 0): string[] => {
  if (!chordSymbol || chordSymbol === 'NC' || chordSymbol === '%') return [];
  
  // Strip trailing dots (duration markers in chordmark notation)
  const cleanedSymbol = chordSymbol.replace(/\.+$/, '');
  
  // Handle slash chords - use the bass note
  let symbol = cleanedSymbol;
  let bassNote: string | null = null;
  if (chordSymbol.includes('/')) {
    const parts = chordSymbol.split('/');
    symbol = parts[0];
    bassNote = parts[1];
  }
  
  // Use Chord.notes() to get the actual note names for the chord
  console.log('symbol', symbol);
  const chordNotes = Chord.notes(symbol);
  console.log('chordNotes', chordNotes);
  if (!chordNotes || chordNotes.length === 0) {
    // Try with just the root if chord parsing fails
    const rootMatch = symbol.match(/^([A-G][#b]?)/);
    if (rootMatch) {
      // Return a proper major triad (root + third + fifth)
      const root = rootMatch[1];
      // Use tonal's Note.transpose to get the correct notes
      const third = Note.transpose(root, '3M'); // Major third
      const fifth = Note.transpose(root, '5P'); // Perfect fifth
      return [`${root}${3 + octaveOffset}`, `${third}${3 + octaveOffset}`, `${fifth}${3 + octaveOffset}`];
    }
    return [];
  }
  
  // Place chord in a nice piano range (octave 3-4 for left hand, 4-5 for right)
  const notes: string[] = [];
  
  // Add bass note if present (lower octave)
  if (bassNote) {
    notes.push(`${bassNote}${2 + octaveOffset}`);
  }
  
  // Add chord notes - keep main triad in same octave for proper chord voicing
  chordNotes.forEach((note, i) => {
    if (i < 3) {
      notes.push(`${note}${3 + octaveOffset}`); // Main triad (root, third, fifth) in same octave
    } else {
      notes.push(`${note}${4 + octaveOffset}`); // Extensions (7th, 9th, etc.) in higher octave
    }
  });
  
  return notes;
};

// Extract chord events with timing from a parsed song
export const extractChordEvents = (song: ParsedSong | null): ChordEvent[] => {
  if (!song?.allLines) return [];
  
  const events: ChordEvent[] = [];
  let currentBeat = 0;
  
  for (let lineIndex = 0; lineIndex < song.allLines.length; lineIndex++) {
    const line = song.allLines[lineIndex];
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
            lineIndex,
          });
        }
        currentBeat += chord.duration || 1;
      }
    }
  }
  
  return events;
};








