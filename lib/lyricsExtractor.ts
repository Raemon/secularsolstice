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

/**
 * Detect file type from filename or content
 */
export const detectFileType = (filename: string, content: string): 'lilypond' | 'chordmark' | 'ultimateguitar' | 'text' | 'markdown' | 'html' | 'csv' | 'unknown' => {
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
  
  // Check content patterns for HTML
  if (content.trim().startsWith('<!DOCTYPE html') || content.trim().startsWith('<html') || /<html[\s>]/i.test(content)) {
    return 'html';
  }

  // Check content patterns for lilypond
  if (content.includes('\\lyricmode') || content.includes('\\version') || content.includes('\\relative')) {
    return 'lilypond';
  }
  
  // Try to parse as chordmark - if it parses successfully, it's chordmark
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
