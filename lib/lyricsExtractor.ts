import { parseSong, renderSong, lineTypes } from 'chord-mark';
import type { LyricLine } from 'chord-mark';

/**
 * Extract the melody content from lilypond, handling nested braces
 */
const extractMelodyContent = (content: string): string | null => {
  // Try multiple patterns to find melody
  const patterns = [
    // Pattern 1: \relative with nested braces
    /\\relative\s+[a-g]['',]*\s*\{/,
    // Pattern 2: \new Voice with relative inside
    /\\new\s+Voice[\s\S]*?\\relative\s+[a-g]['',]*\s*\{/,
    // Pattern 3: Just look for \relative
    /\\relative/
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      // Find the opening brace position
      const startPos = content.indexOf('{', match.index!);
      if (startPos === -1) continue;
      
      // Match braces to find the complete block
      let braceCount = 1;
      let pos = startPos + 1;
      while (pos < content.length && braceCount > 0) {
        if (content[pos] === '{') braceCount++;
        if (content[pos] === '}') braceCount--;
        pos++;
      }
      
      if (braceCount === 0) {
        return content.substring(startPos + 1, pos - 1);
      }
    }
  }
  
  return null;
};

/**
 * Parse time signature from melody
 */
const parseTimeSignature = (melody: string): { numerator: number; denominator: number } | null => {
  const timeMatch = melody.match(/\\time\s+(\d+)\/(\d+)/);
  if (timeMatch) {
    return {
      numerator: parseInt(timeMatch[1], 10),
      denominator: parseInt(timeMatch[2], 10)
    };
  }
  return null;
};

/**
 * Calculate duration in quarter notes
 */
const calculateDuration = (durationStr: string, defaultDuration: number): number => {
  if (!durationStr) return defaultDuration;
  
  // Parse duration number (1, 2, 4, 8, 16, 32, etc.)
  const match = durationStr.match(/^(\d+)(\.*)$/);
  if (!match) return defaultDuration;
  
  const number = parseInt(match[1], 10);
  const dots = match[2].length;
  
  // Convert to quarter notes (4 = quarter note = 1)
  let duration = 4 / number;
  
  // Add dotted duration (each dot adds half of the previous duration)
  let additionalDuration = duration;
  for (let i = 0; i < dots; i++) {
    additionalDuration /= 2;
    duration += additionalDuration;
  }
  
  return duration;
};

/**
 * Count syllables per measure from melody
 */
const countSyllablesPerMeasure = (melody: string): number[] => {
  // Check if melody has explicit bar lines
  const hasBarLines = melody.includes('|');
  
  if (hasBarLines) {
    // Original logic for explicit bar lines
    const measures = melody.split('|').filter(m => m.trim().length > 0);
    
    return measures.map(measure => {
      // Remove comments
      const cleaned = measure.replace(/%.*$/gm, '');
      
      // Count note events
      const notePattern = /\b[a-gr](?:is|es|isis|eses)?['',]*[0-9]*\.*/g;
      const notes = cleaned.match(notePattern) || [];
      
      // Filter out common non-note commands that might match
      const actualNotes = notes.filter(note => {
        const base = note.replace(/[',0-9.]/g, '');
        return base.length > 0 && !base.startsWith('\\');
      });
      
      return actualNotes.length;
    });
  }
  
  // Handle implicit measures based on time signature
  const timeSignature = parseTimeSignature(melody);
  if (!timeSignature) {
    console.warn('[LyricsExtractor] No time signature found, cannot determine measure boundaries');
    return [];
  }
  
  // Calculate measure length in quarter notes
  const measureLength = (timeSignature.numerator * 4) / timeSignature.denominator;
  
  // Handle \repeat unfold - expand repeated sections
  let expandedMelody = melody;
  const repeatPattern = /\\repeat\s+unfold\s+(\d+)\s*\{([^}]+)\}/g;
  let repeatMatch;
  while ((repeatMatch = repeatPattern.exec(expandedMelody)) !== null) {
    const repeatCount = parseInt(repeatMatch[1], 10);
    const repeatedSection = repeatMatch[2];
    const expanded = Array(repeatCount).fill(repeatedSection).join(' ');
    expandedMelody = expandedMelody.substring(0, repeatMatch.index) + expanded + expandedMelody.substring(repeatMatch.index + repeatMatch[0].length);
    // Reset regex to start from beginning after modification
    repeatPattern.lastIndex = 0;
  }
  
  // Remove comments and commands
  let cleaned = expandedMelody.replace(/%.*$/gm, '');
  cleaned = cleaned.replace(/\\break/g, '');
  cleaned = cleaned.replace(/\\time\s+\d+\/\d+/g, '');
  cleaned = cleaned.replace(/\\clef\s+\w+/g, '');
  cleaned = cleaned.replace(/\}/g, ' ');
  cleaned = cleaned.replace(/\(/g, '');
  cleaned = cleaned.replace(/\)/g, '');
  
  // Extract all notes with their durations
  const notePattern = /\b([a-gr](?:is|es|isis|eses)?['',]*)([0-9]*\.*)(?=\s|$)/g;
  const notes: Array<{ note: string; duration: number }> = [];
  let lastDuration = 4; // Default to quarter note
  let match;
  
  while ((match = notePattern.exec(cleaned)) !== null) {
    const noteName = match[1];
    const durationStr = match[2];
    
    // Skip if it looks like a command
    if (noteName.startsWith('\\')) continue;
    
    const duration = calculateDuration(durationStr, lastDuration);
    if (durationStr) lastDuration = duration;
    
    notes.push({ note: noteName, duration });
  }
  
  // Group notes into measures based on duration
  const measures: number[] = [];
  let currentMeasureDuration = 0;
  let currentMeasureNoteCount = 0;
  
  for (const note of notes) {
    currentMeasureDuration += note.duration;
    currentMeasureNoteCount++;
    
    // Check if we've completed a measure (with some tolerance for rounding)
    if (Math.abs(currentMeasureDuration - measureLength) < 0.01) {
      measures.push(currentMeasureNoteCount);
      currentMeasureDuration = 0;
      currentMeasureNoteCount = 0;
    } else if (currentMeasureDuration > measureLength) {
      // Overflow - this measure is complete, carry over the excess
      measures.push(currentMeasureNoteCount - 1);
      currentMeasureDuration = note.duration;
      currentMeasureNoteCount = 1;
    }
  }
  
  // Add any remaining notes as a final measure
  if (currentMeasureNoteCount > 0) {
    measures.push(currentMeasureNoteCount);
  }
  
  return measures;
};

/**
 * Extract lyrics from lilypond (.ly) file content
 */
export const extractLyricsFromLilypond = (content: string): string => {
  const lyrics: string[] = [];
  
  // Find melody section to count measures
  const melody = extractMelodyContent(content);
  let syllablesPerMeasure: number[] = [];
  
  if (melody) {
    syllablesPerMeasure = countSyllablesPerMeasure(melody);
    console.log('[LyricsExtractor] Detected', syllablesPerMeasure.length, 'measures with syllable counts:', syllablesPerMeasure);
  } else {
    console.warn('[LyricsExtractor] Could not detect melody structure');
  }
  
  // Find all \lyricmode blocks
  const lyricModeRegex = /\\lyricmode\s*\{/g;
  let match;
  
  while ((match = lyricModeRegex.exec(content)) !== null) {
    // Extract the lyric block with brace matching
    const startPos = content.indexOf('{', match.index);
    if (startPos === -1) continue;
    
    let braceCount = 1;
    let pos = startPos + 1;
    while (pos < content.length && braceCount > 0) {
      if (content[pos] === '{') braceCount++;
      if (content[pos] === '}') braceCount--;
      pos++;
    }
    
    if (braceCount !== 0) continue;
    
    const lyricBlock = content.substring(startPos + 1, pos - 1);
    
    // Split into tokens and process
    const tokens = lyricBlock.split(/\s+/).filter(t => t.length > 0);
    
    // Track both display words and syllable count
    interface WordInfo {
      text: string;
      syllableCount: number;
    }
    const words: WordInfo[] = [];
    
    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i];
      
      // Clean the token
      token = token
        .replace(/\\/g, '')   // Remove backslashes
        .replace(/"/g, '')    // Remove quotes
        .replace(/[{}]/g, '') // Remove braces
        .replace(/_/g, '')    // Remove melisma
        .trim();
      
      if (!token) continue;
      
      // If token is "--", join with previous word
      if (token === '--' || token === '—') {
        // The previous syllable should be joined with the next
        // We'll mark this by continuing to the next token
        continue;
      }
      
      // Check if previous token was "--"
      if (i > 0 && (tokens[i - 1].trim() === '--' || tokens[i - 1].trim() === '—')) {
        // Join with the previous word BUT count as a syllable
        if (words.length > 0) {
          words[words.length - 1].text += token;
          words[words.length - 1].syllableCount++;
        } else {
          words.push({ text: token, syllableCount: 1 });
        }
      } else {
        words.push({ text: token, syllableCount: 1 });
      }
    }
    
    // Insert linebreaks every two measures
    if (syllablesPerMeasure.length > 0 && words.length > 0) {
      const lines: string[] = [];
      let currentLine: string[] = [];
      let measureCount = 0;
      let syllablesInCurrentMeasure = 0;
      
      for (const wordInfo of words) {
        currentLine.push(wordInfo.text);
        syllablesInCurrentMeasure += wordInfo.syllableCount;
        
        // Check if we've completed a measure
        if (measureCount < syllablesPerMeasure.length) {
          while (measureCount < syllablesPerMeasure.length && syllablesInCurrentMeasure >= syllablesPerMeasure[measureCount]) {
            const syllablesUsed = syllablesPerMeasure[measureCount];
            syllablesInCurrentMeasure -= syllablesUsed;
            measureCount++;
            
            // Every 2 measures, start a new line
            if (measureCount % 2 === 0) {
              lines.push(currentLine.join(' '));
              currentLine = [];
            }
          }
        } else {
          // If we've run out of measures, just add 4-5 words per line as fallback
          if (currentLine.length >= 8) {
            lines.push(currentLine.join(' '));
            currentLine = [];
          }
        }
      }
      
      // Add remaining syllables
      if (currentLine.length > 0) {
        lines.push(currentLine.join(' '));
      }
      
      if (lines.length > 0) {
        lyrics.push(lines.join('\n'));
      }
    } else {
      // Fallback: split into lines of ~8 words each
      const lines: string[] = [];
      let currentLine: string[] = [];
      
      for (const wordInfo of words) {
        currentLine.push(wordInfo.text);
        if (currentLine.length >= 8) {
          lines.push(currentLine.join(' '));
          currentLine = [];
        }
      }
      
      if (currentLine.length > 0) {
        lines.push(currentLine.join(' '));
      }
      
      if (lines.length > 0) {
        lyrics.push(lines.join('\n'));
      }
    }
  }
  
  return lyrics.join('\n\n');
};

/**
 * Extract lyrics from chordmark format content
 * Uses the same rendering approach as ChordmarkRenderer for consistency
 */
export const extractLyricsFromChordmark = (content: string): string => {
  try {
    const parsed = parseSong(content);
    // Use renderSong with chartType: 'lyrics' to get lyrics-only HTML (same as ChordmarkRenderer)
    const lyricsHtml = renderSong(parsed, { chartType: 'lyrics' });
    
    // Parse HTML and extract text content
    if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(lyricsHtml, 'text/html');
      
      // Get all text nodes, preserving line breaks
      const lines: string[] = [];
      const elements = doc.querySelectorAll('.cmLyricLine, .cmEmptyLine, .cmChordLyricLine');
      
      elements.forEach(element => {
        if (element.classList.contains('cmEmptyLine')) {
          lines.push('');
        } else {
          // Extract just the lyric text, ignoring any chord symbols
          const lyricElements = element.querySelectorAll('.cmLyric');
          if (lyricElements.length > 0) {
            const text = Array.from(lyricElements).map(el => el.textContent || '').join('');
            lines.push(text);
          } else {
            lines.push(element.textContent || '');
          }
        }
      });
      
      return lines.join('\n');
    }
    
    // Fallback for server-side: manually extract from parsed song
    const lyrics: string[] = [];
    for (const line of parsed.allLines) {
      if (line.type === lineTypes.LYRIC) {
        const lyricLine = line as LyricLine;
        const lyricText = lyricLine.lyrics || '';
        if (lyricText.trim()) {
          lyrics.push(lyricText);
        } else {
          lyrics.push('');
        }
      } else if (line.type === lineTypes.EMPTY_LINE) {
        lyrics.push('');
      }
    }
    return lyrics.join('\n');
  } catch (error) {
    console.error('Failed to parse chordmark content:', error);
    return '';
  }
};

/**
 * Extract lyrics from Ultimate Guitar tab or plain text format
 * This filters out lines that appear to be chord-only lines
 */
export const extractLyricsFromUltimateGuitar = (content: string): string => {
  const lines = content.split('\n');
  const lyrics: string[] = [];
  
  // Common chord patterns
  const chordPattern = /^[\s]*([A-G][#b]?(m|maj|min|aug|dim|sus)?[0-9]?[\/]?[A-G]?[#b]?[\s]*)+[\s]*$/;
  const barPattern = /^\s*\|.*\|\s*$/;
  const sectionPattern = /^\s*(Verse|Chorus|Bridge|Intro|Outro|Tag|Pre-Chorus|Instrumental)/i;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Preserve all empty lines
    if (!trimmed) {
      lyrics.push('');
      continue;
    }
    
    // Skip section headers
    if (sectionPattern.test(trimmed)) {
      continue;
    }
    
    // Skip chord-only lines (lines with only chord names)
    if (chordPattern.test(trimmed)) {
      continue;
    }
    
    // Skip bar notation lines
    if (barPattern.test(trimmed)) {
      continue;
    }
    
    // Keep the line if it has text content
    lyrics.push(line);
  }
  
  // Remove trailing empty lines
  while (lyrics.length > 0 && lyrics[lyrics.length - 1] === '') {
    lyrics.pop();
  }
  
  return lyrics.join('\n');
};

interface MeasureData {
  number: number;
  chords: string[];
  lyrics: { text: string; syllabic: string | null }[];
  restBeatsBeforeLyrics: number; // Beats of rest before first lyric in measure
  hasOnlyRests: boolean; // True if measure has no sung notes (only rests)
}

interface SyllablePart { text: string; syllabic: string | null; }

/**
 * Combine syllables into words based on MusicXML syllabic values
 * syllabic values: 'begin', 'middle', 'end', 'single', or null
 */
const combineSyllablesIntoWords = (parts: SyllablePart[]): string[] => {
  const words: string[] = [];
  let currentWord = '';
  for (const part of parts) {
    if (part.syllabic === 'begin' || part.syllabic === 'middle') {
      currentWord += part.text;
    } else if (part.syllabic === 'end') {
      currentWord += part.text;
      words.push(currentWord);
      currentWord = '';
    } else {
      if (currentWord) { words.push(currentWord); currentWord = ''; }
      words.push(part.text);
    }
  }
  if (currentWord) words.push(currentWord);
  return words;
};

// Pitch class values (C=0, C#=1, D=2, etc.)
const pitchClassMap: Record<string, number> = {
  'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
};

// Chord templates: intervals from root (in semitones)
const chordTemplates: { name: string; intervals: number[]; suffix: string }[] = [
  { name: 'major', intervals: [0, 4, 7], suffix: '' },
  { name: 'minor', intervals: [0, 3, 7], suffix: 'm' },
  { name: 'diminished', intervals: [0, 3, 6], suffix: 'dim' },
  { name: 'augmented', intervals: [0, 4, 8], suffix: 'aug' },
  { name: 'sus4', intervals: [0, 5, 7], suffix: 'sus4' },
  { name: 'sus2', intervals: [0, 2, 7], suffix: 'sus2' },
  { name: 'major7', intervals: [0, 4, 7, 11], suffix: 'maj7' },
  { name: 'dominant7', intervals: [0, 4, 7, 10], suffix: '7' },
  { name: 'minor7', intervals: [0, 3, 7, 10], suffix: 'm7' },
  { name: 'dim7', intervals: [0, 3, 6, 9], suffix: 'dim7' },
  { name: 'halfDim7', intervals: [0, 3, 6, 10], suffix: 'm7b5' },
];

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Infer chord from a set of pitch classes
 */
const inferChordFromPitches = (pitchClasses: Set<number>, bassNote?: number): string | null => {
  if (pitchClasses.size < 2) return null;
  const pitches = Array.from(pitchClasses).sort((a, b) => a - b);
  let bestMatch: { root: number; suffix: string; score: number } | null = null;
  // Try each pitch as a potential root
  for (const root of pitches) {
    // Calculate intervals from this root
    const intervals = pitches.map(p => (p - root + 12) % 12);
    // Try to match against templates
    for (const template of chordTemplates) {
      const matchCount = template.intervals.filter(i => intervals.includes(i)).length;
      const extraNotes = intervals.filter(i => !template.intervals.includes(i)).length;
      const score = matchCount / template.intervals.length - extraNotes * 0.1;
      if (matchCount >= Math.min(3, template.intervals.length) && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { root, suffix: template.suffix, score };
      }
    }
  }
  if (!bestMatch) {
    // Fallback: use bass note as root, assume major/minor based on third
    const root = bassNote !== undefined ? bassNote : pitches[0];
    const intervals = pitches.map(p => (p - root + 12) % 12);
    const hasMinorThird = intervals.includes(3);
    const hasMajorThird = intervals.includes(4);
    if (hasMajorThird) {
      bestMatch = { root, suffix: '', score: 0.5 };
    } else if (hasMinorThird) {
      bestMatch = { root, suffix: 'm', score: 0.5 };
    } else {
      bestMatch = { root, suffix: '', score: 0.3 };
    }
  }
  const rootName = noteNames[bestMatch.root];
  // If bass note is different from root, add bass notation
  if (bassNote !== undefined && bassNote !== bestMatch.root) {
    return rootName + bestMatch.suffix + '/' + noteNames[bassNote];
  }
  return rootName + bestMatch.suffix;
};

/**
 * Extract pitch class from a MusicXML note element
 */
const extractPitchClass = (noteEl: Element): { pitchClass: number; octave: number } | null => {
  const pitchEl = noteEl.querySelector('pitch');
  if (!pitchEl) return null;
  const step = pitchEl.querySelector('step')?.textContent || '';
  const alter = parseInt(pitchEl.querySelector('alter')?.textContent || '0', 10);
  const octave = parseInt(pitchEl.querySelector('octave')?.textContent || '4', 10);
  if (!step || !(step in pitchClassMap)) return null;
  const pitchClass = (pitchClassMap[step] + alter + 12) % 12;
  return { pitchClass, octave };
};

/**
 * Convert rest beats to ChordMark rest notation
 * Each dot represents 1 beat, so r... = 3 beats
 * Uses floor to ignore fractional beats (e.g., 3.5 → 3)
 */
const beatsToRestNotation = (beats: number): string => {
  if (beats < 1) return ''; // Ignore rests less than 1 beat
  const wholeBeats = Math.floor(beats);
  if (wholeBeats <= 0) return '';
  return 'r' + '.'.repeat(wholeBeats);
};

/**
 * Convert MusicXML to chordmark format
 * Extracts measures, chords (or infers them from notes), and lyrics
 */
export const convertMusicXmlToChordmark = (xmlContent: string): string => {
  try {
    if (typeof DOMParser === 'undefined') {
      return ''; // Server-side not supported
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) return '';
    // Get all parts
    const parts = doc.querySelectorAll('part');
    if (parts.length === 0) return '';
    // Get all unique measure numbers from the first part
    const firstPart = parts[0];
    const measureElements = firstPart.querySelectorAll('measure');
    if (measureElements.length === 0) return '';
    // Check if document has any explicit harmony elements - if so, don't infer chords
    const hasExplicitHarmony = doc.querySelector('harmony') !== null;
    // Get divisions (divisions per quarter note) - default to 1 if not found
    const divisionsEl = firstPart.querySelector('attributes divisions');
    const divisions = divisionsEl ? parseInt(divisionsEl.textContent || '1', 10) : 1;
    // Build measure data, collecting from ALL parts
    const measures: MeasureData[] = [];
    measureElements.forEach((_, idx) => {
      const measureNum = parseInt(measureElements[idx].getAttribute('number') || String(idx + 1), 10);
      const measureData: MeasureData = { number: measureNum, chords: [], lyrics: [], restBeatsBeforeLyrics: 0, hasOnlyRests: true };
      const pitchClasses = new Set<number>();
      let bassNote: number | undefined;
      let lowestOctave = Infinity;
      // Collect data from ALL parts for this measure
      for (const part of Array.from(parts)) {
        const partMeasure = part.querySelector(`measure[number="${measureNum}"]`);
        if (!partMeasure) continue;
        // Extract chord symbols from <harmony> elements
        const harmonyElements = partMeasure.querySelectorAll('harmony');
        harmonyElements.forEach(harmony => {
          const rootStep = harmony.querySelector('root-step')?.textContent || '';
          const rootAlter = harmony.querySelector('root-alter')?.textContent || '';
          const kind = harmony.querySelector('kind')?.textContent || '';
          if (rootStep && measureData.chords.length === 0) { // Only take first harmony found
            let chordSymbol = rootStep;
            if (rootAlter === '-1') chordSymbol += 'b';
            else if (rootAlter === '1') chordSymbol += '#';
            const kindMap: Record<string, string> = {
              'major': '', 'minor': 'm', 'dominant': '7', 'major-seventh': 'maj7',
              'minor-seventh': 'm7', 'diminished': 'dim', 'augmented': 'aug',
              'suspended-fourth': 'sus4', 'suspended-second': 'sus2',
              'dominant-ninth': '9', 'major-sixth': '6', 'minor-sixth': 'm6',
            };
            chordSymbol += kindMap[kind] || '';
            const bassStep = harmony.querySelector('bass-step')?.textContent;
            const bassAlter = harmony.querySelector('bass-alter')?.textContent;
            if (bassStep) {
              chordSymbol += '/' + bassStep;
              if (bassAlter === '-1') chordSymbol += 'b';
              else if (bassAlter === '1') chordSymbol += '#';
            }
            measureData.chords.push(chordSymbol);
          }
        });
        // Process notes to collect chord inference data, lyrics, and track rests
        const notes = partMeasure.querySelectorAll('note');
        let restDurationBeforeLyrics = 0;
        let foundLyricInThisPart = false;
        let hasSungNoteInThisPart = false;
        notes.forEach(note => {
          const isRest = note.querySelector('rest') !== null;
          const duration = parseInt(note.querySelector('duration')?.textContent || '0', 10);
          const durationInBeats = duration / divisions; // Convert to beats (quarter notes)
          if (isRest) {
            // Track rest duration before first lyric
            if (!foundLyricInThisPart) {
              restDurationBeforeLyrics += durationInBeats;
            }
            return;
          }
          // It's a pitched note
          hasSungNoteInThisPart = true;
          const pitchInfo = extractPitchClass(note);
          if (pitchInfo) {
            pitchClasses.add(pitchInfo.pitchClass);
            if (pitchInfo.octave < lowestOctave) {
              lowestOctave = pitchInfo.octave;
              bassNote = pitchInfo.pitchClass;
            }
          }
          // Extract lyrics
          const lyricEl = note.querySelector('lyric');
          if (lyricEl && (measureData.lyrics.length === 0 || foundLyricInThisPart)) {
            const syllabicEl = lyricEl.querySelector('syllabic');
            const textEl = lyricEl.querySelector('text');
            if (textEl?.textContent) {
              if (!foundLyricInThisPart) {
                // First lyric in this part - record rest beats before it
                measureData.restBeatsBeforeLyrics = restDurationBeforeLyrics;
                foundLyricInThisPart = true;
              }
              measureData.lyrics.push({
                text: textEl.textContent,
                syllabic: syllabicEl?.textContent || null
              });
            }
          }
        });
        // If this part has sung notes, the measure isn't only rests
        if (hasSungNoteInThisPart) {
          measureData.hasOnlyRests = false;
        }
      }
      // Infer chord from notes only if document has no explicit harmony elements
      if (!hasExplicitHarmony && measureData.chords.length === 0 && pitchClasses.size >= 2) {
        const inferredChord = inferChordFromPitches(pitchClasses, bassNote);
        if (inferredChord) {
          measureData.chords.push(inferredChord);
        }
      }
      measures.push(measureData);
    });
    const combineLyrics = (lyrics: SyllablePart[]): string => combineSyllablesIntoWords(lyrics).join(' ').trim();
    // Build chordmark output - 2 measures per line
    const output: string[] = [];
    const measuresPerLine = 2;
    let lastChord = '';
    for (let i = 0; i < measures.length; i += measuresPerLine) {
      const lineMeasures = measures.slice(i, i + measuresPerLine);
      // Build chord line - one chord per measure (repeat previous if same)
      const chordParts: string[] = [];
      for (const m of lineMeasures) {
        const chord = m.chords.length > 0 ? m.chords[0] : lastChord;
        chordParts.push(chord || '%');
        if (chord) lastChord = chord;
      }
      // Only output chord line if we have chords
      if (chordParts.some(c => c && c !== '%')) {
        output.push(chordParts.join(' '));
      }
      // Build lyric line with _ markers at measure boundaries (including start)
      // Also include rest notation for rests before lyrics
      const lyricParts: string[] = [];
      for (let j = 0; j < lineMeasures.length; j++) {
        const m = lineMeasures[j];
        const lyricText = combineLyrics(m.lyrics);
        if (lyricText) {
          // Add rest notation if there are rests before the lyrics
          const restNotation = beatsToRestNotation(m.restBeatsBeforeLyrics);
          // Always prefix with _ to mark measure boundary, optionally with rest notation
          lyricParts.push('_' + restNotation + (restNotation ? ' ' : '') + lyricText);
        } else if (m.hasOnlyRests || lyricParts.length > 0) {
          // Add just _ for empty measures (rests only) or if previous measure had lyrics
          lyricParts.push('_');
        }
      }
      if (lyricParts.length > 0) {
        output.push(lyricParts.join(' '));
      }
    }
    return output.join('\n');
  } catch (error) {
    console.error('Failed to convert MusicXML to chordmark:', error);
    return '';
  }
};

/**
 * Extract lyrics from MusicXML content
 * Parses <lyric> elements within <note> elements
 */
export const extractLyricsFromMusicXml = (xmlContent: string): string => {
  try {
    // Use DOMParser if available (browser), otherwise basic regex parsing
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'application/xml');
      // Check for parsing errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        console.error('MusicXML parse error:', parseError.textContent);
        return '';
      }
      // Get all lyric elements
      const lyricElements = doc.querySelectorAll('lyric');
      if (lyricElements.length === 0) return '';
      // Build lyrics by tracking syllables and word boundaries
      const parts: SyllablePart[] = [];
      lyricElements.forEach(lyric => {
        const syllabicEl = lyric.querySelector('syllabic');
        const textEl = lyric.querySelector('text');
        if (textEl?.textContent) {
          parts.push({
            syllabic: syllabicEl?.textContent || null,
            text: textEl.textContent
          });
        }
      });
      const words = combineSyllablesIntoWords(parts);
      // Format into lines (roughly 8 words per line for readability)
      const lines: string[] = [];
      for (let i = 0; i < words.length; i += 8) {
        lines.push(words.slice(i, i + 8).join(' '));
      }
      return lines.join('\n');
    }
    // Fallback: regex-based extraction for server-side
    const lyricRegex = /<lyric[^>]*>[\s\S]*?<text>([^<]+)<\/text>[\s\S]*?<\/lyric>/g;
    const syllabicRegex = /<syllabic>([^<]+)<\/syllabic>/;
    const matches = [...xmlContent.matchAll(lyricRegex)];
    if (matches.length === 0) return '';
    const parts: SyllablePart[] = matches.map(match => {
      const lyricBlock = match[0];
      const syllabicMatch = lyricBlock.match(syllabicRegex);
      return { text: match[1], syllabic: syllabicMatch ? syllabicMatch[1] : null };
    });
    const words = combineSyllablesIntoWords(parts);
    const lines: string[] = [];
    for (let i = 0; i < words.length; i += 8) {
      lines.push(words.slice(i, i + 8).join(' '));
    }
    return lines.join('\n');
  } catch (error) {
    console.error('Failed to extract lyrics from MusicXML:', error);
    return '';
  }
};

/**
 * Detect file type from filename or content
 */
export const detectFileType = (filename: string, content: string): 'lilypond' | 'chordmark' | 'ultimateguitar' | 'text' | 'markdown' | 'html' | 'csv' | 'musicxml' | 'unknown' => {
  const lowerFilename = filename.toLowerCase();
  
  // Check file extension first
  if (lowerFilename.endsWith('.ly') || lowerFilename.endsWith('.lilypond')) {
    return 'lilypond';
  }

  if (lowerFilename.endsWith('.txt') || lowerFilename.endsWith('.text')) {
    return 'text';
  }
  
  if (lowerFilename.endsWith('.chordmark') || lowerFilename.endsWith('.cho')) {
    return 'chordmark';
  }

  if (lowerFilename.endsWith('.ugc')) {
    return 'ultimateguitar';
  }

  if (lowerFilename.endsWith('.markdown') || lowerFilename.endsWith('.md')) {
    return 'markdown';
  }

  if (lowerFilename.endsWith('.html') || lowerFilename.endsWith('.htm')) {
    return 'html';
  }

  if (lowerFilename.endsWith('.csv')) {
    return 'csv';
  }

  if (lowerFilename.endsWith('.musicxml') || lowerFilename.endsWith('.mxl') || lowerFilename.endsWith('.xml') || lowerFilename.endsWith('.mxml')) {
    return 'musicxml';
  }
  
  // Check content patterns for HTML
  if (content.trim().startsWith('<!DOCTYPE html') || content.trim().startsWith('<html') || /<html[\s>]/i.test(content)) {
    return 'html';
  }

  // Check content patterns for lilypond
  if (content.includes('\\lyricmode') || content.includes('\\version') || content.includes('\\relative')) {
    return 'lilypond';
  }

  // Check content patterns for MusicXML
  if (content.includes('<score-partwise') || content.includes('<score-timewise') || content.includes('<!DOCTYPE score-partwise')) {
    return 'musicxml';
  }
  
  // Try to parse as chordmark - if it parses successfully and has content, it's chordmark
  if (content.trim()) {
    try {
      parseSong(content);
      // If parsing succeeded and content has bar notation or chord symbols, it's chordmark
      if (content.includes('|') || /\[[A-G][#b]?(m|maj|min|sus|aug|dim)?[0-9]?\]/.test(content)) {
        return 'chordmark';
      }
      // Even without bars, if it parsed and has some structure, assume chordmark
      return 'chordmark';
    } catch {
      // Not chordmark, fall through to ultimateguitar
    }
  }
  
  // Default to ultimate guitar format for plain text
  return 'ultimateguitar';
};

/**
 * Extract lyrics from any supported format
 * Automatically detects the format and uses the appropriate extraction method
 */
export const extractLyrics = (content: string, filename: string = ''): string => {
  const fileType = detectFileType(filename, content);
  
  switch (fileType) {
    case 'lilypond':
      return extractLyricsFromLilypond(content);
    case 'chordmark':
      return extractLyricsFromChordmark(content);
    case 'musicxml':
      return extractLyricsFromMusicXml(content);
    case 'ultimateguitar':
      return extractLyricsFromUltimateGuitar(content);
    default:
      // Fallback: try ultimate guitar format
      return extractLyricsFromUltimateGuitar(content);
  }
};

/**
 * Extract lyrics from a SongVersion object
 */
export const extractLyricsFromVersion = (version: { label: string; content: string | null }): string => {
  if (!version.content) {
    return '';
  }
  
  return extractLyrics(version.content, version.label);
};
