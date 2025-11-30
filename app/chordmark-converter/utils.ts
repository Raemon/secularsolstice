import { lineTypes } from 'chord-mark';
import type {
  SongLine,
  ParsedSong,
  SectionLabelLine,
  TimeSignatureLine,
  KeyDeclarationLine,
  ChordLine,
  LyricLine,
  Bar,
  Chord,
} from 'chord-mark';

export const extractTextFromHTML = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const textContent = doc.body.textContent || '';
  return textContent.trim();
};

const isSectionLabelLine = (line: SongLine): line is SectionLabelLine => {
  return line.type === lineTypes.SECTION_LABEL;
};

const isTimeSignatureLine = (line: SongLine): line is TimeSignatureLine => {
  return line.type === lineTypes.TIME_SIGNATURE;
};

const isKeyDeclarationLine = (line: SongLine): line is KeyDeclarationLine => {
  return line.type === lineTypes.KEY_DECLARATION;
};

const isChordLine = (line: SongLine): line is ChordLine => {
  return line.type === lineTypes.CHORD;
};

const isLyricLine = (line: SongLine): line is LyricLine => {
  return line.type === lineTypes.LYRIC;
};

export const serializeToChordmark = (parsed: ParsedSong): string => {
  const lines: string[] = [];
  
  for (const line of parsed.allLines) {
    if (!line || !line.type) continue;
    
    if (line.string !== undefined) {
      lines.push(line.string);
    } else if (line.type === lineTypes.EMPTY_LINE) {
      lines.push('');
    } else if (isSectionLabelLine(line)) {
      const label = line.label || '';
      const copyIndex = line.copyIndex;
      const multiplyTimes = line.multiplyTimes;
      let sectionLine = `#${label}`;
      if (copyIndex && copyIndex > 1) {
        sectionLine += copyIndex.toString();
      }
      if (multiplyTimes && multiplyTimes > 0) {
        sectionLine += ` x${multiplyTimes}`;
      }
      lines.push(sectionLine);
    } else if (isTimeSignatureLine(line)) {
      const ts = line.timeSignature;
      if (ts?.string) {
        lines.push(ts.string);
      }
    } else if (isKeyDeclarationLine(line)) {
      const model = line.model;
      if (model) {
        const keyStr = model.root + (model.symbol || '');
        lines.push(`{key: ${keyStr}}`);
      }
    } else if (isChordLine(line)) {
      const allBars = line.allBars;
      if (allBars && Array.isArray(allBars)) {
        const barStrings = allBars.map((bar: Bar) => {
          if (bar.isRepeated) {
            return '';
          }
          if (bar.allChords && Array.isArray(bar.allChords)) {
            const chords = bar.allChords.map((chord: Chord) => chord.string || '').filter((s: string) => s).join(' ');
            return chords;
          }
          return '';
        });
        const barLine = '|' + barStrings.join('|') + '|';
        lines.push(barLine);
      }
    } else if (isLyricLine(line)) {
      const lyrics = line.lyrics;
      if (lyrics) {
        let lyricLine = lyrics;
        const chordPositions = line.chordPositions || [];
        if (chordPositions.length > 0) {
          const chars = lyricLine.split('');
          for (let i = chordPositions.length - 1; i >= 0; i--) {
            chars.splice(chordPositions[i], 0, '_');
          }
          lyricLine = chars.join('');
        }
        lines.push(lyricLine);
      }
    }
  }
  
  return lines.join('\n');
};

const normalizeChordLine = (line: string): string => {
  return line
    .replace(/G_B/g, 'G/B')
    .replace(/D_A/g, 'D/A')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const convertCustomFormatToChordmark = (text: string): string => {
  const lines = text.split('\n');
  const output: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) {
      output.push('');
      continue;
    }
    
    const hasBars = trimmed.includes('|');
    const startsWithChord = trimmed.match(/^[A-G][#b]?[m]?[0-9]?/);
    const isAlreadySection = trimmed.startsWith('#');
    const hasSpecialChars = trimmed.match(/[{}]/);
    const isTimeSignature = trimmed.match(/^\d+\/\d+$/);
    const isKeyDeclaration = trimmed.match(/^\{key:/);
    
    const isOnlyText = !hasBars && !startsWithChord && !isAlreadySection && !hasSpecialChars && !isTimeSignature && !isKeyDeclaration;
    
    if (isOnlyText) {
      const sectionName = trimmed.replace(/-+\s*$/, '').trim();
      
      if (sectionName.toLowerCase().startsWith('final chord strum:')) {
        const chord = sectionName.split(':')[1]?.trim();
        if (chord) {
          output.push('');
          output.push(`#o`);
          output.push(chord);
        }
        continue;
      }
      
      let normalizedSection = sectionName.toLowerCase();
      
      if (normalizedSection === 'intro') {
        normalizedSection = 'i';
      } else if (normalizedSection.match(/^verse[_\s]refrain\s+([ab])/i)) {
        const match = normalizedSection.match(/verse[_\s]refrain\s+([ab])/i);
        normalizedSection = `vr${match ? match[1] : 'a'}`;
      } else if (normalizedSection === 'verse') {
        normalizedSection = 'v';
      } else if (normalizedSection === 'chorus') {
        normalizedSection = 'c';
      } else if (normalizedSection === 'bridge') {
        normalizedSection = 'b';
      } else if (normalizedSection === 'outro' || normalizedSection === 'ending') {
        normalizedSection = 'o';
      } else if (normalizedSection.match(/^instrumental/)) {
        const match = normalizedSection.match(/instrumental\s*(\d*)/i);
        normalizedSection = match && match[1] ? `i${match[1]}` : 'i';
      } else {
        normalizedSection = sectionName.toLowerCase().replace(/[^a-z0-9]/g, '');
      }
      
      output.push(`#${normalizedSection}`);
      continue;
    }
    
    if (trimmed.includes('|')) {
      output.push(normalizeChordLine(trimmed));
    } else if (trimmed.match(/^[A-G][#b]?[m]?[0-9]?/)) {
      output.push(`|${normalizeChordLine(trimmed)}|`);
    } else if (isAlreadySection) {
      output.push(trimmed);
    } else if (isTimeSignature || isKeyDeclaration) {
      output.push(trimmed);
    } else {
      const normalizedSection = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedSection) {
        output.push(`#${normalizedSection}`);
      } else {
        output.push(trimmed);
      }
    }
  }
  
  return output.join('\n');
};

export const combineChordsAndLyrics = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const songDiv = doc.querySelector('.cmSong');
  if (!songDiv) return html;

  const sections = songDiv.querySelectorAll('.cmSection');
  sections.forEach((section) => {
    const lines = Array.from(section.querySelectorAll('p.cmLine'));
    const replacements: { element: Element; newHtml: string }[] = [];
    const toRemove: Element[] = [];
    const processedElements = new Set<Element>();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lyricContent = line.querySelector('.cmLyricLine')?.textContent || '';
      const isChordLine = lyricContent.trim().startsWith('|') && lyricContent.trim().endsWith('|');
      
      if (isChordLine) {
        const chordContent = lyricContent;
        
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          if (processedElements.has(nextLine)) continue;
          
          const nextLyricContent = nextLine.querySelector('.cmLyricLine');
          const isNextLineSection = nextLine.querySelector('.cmSectionLabel');
          const isNextLineEmpty = nextLine.querySelector('.cmEmptyLine');
          const nextText = nextLyricContent?.textContent?.trim() || '';
          const isNextLineChord = nextText.startsWith('|') && nextText.endsWith('|');
          
          if (isNextLineChord || isNextLineSection) {
            break;
          }
          
          if (nextLyricContent && !isNextLineEmpty) {
            const lyricHtml = nextLyricContent.innerHTML;
            replacements.push({
              element: nextLine,
              newHtml: `<span class="cmChordLyricLine"><span class="cmChordLyricPair"><span class="cmChordLine">${chordContent}</span><span class="cmLyricLine">${lyricHtml}</span></span></span>`
            });
            processedElements.add(nextLine);
          } else if (isNextLineEmpty) {
            break;
          }
        }
        
        toRemove.push(line);
      }
    }
    
    replacements.forEach(({ element, newHtml }) => {
      if (element.parentElement) {
        const combined = doc.createElement('p');
        combined.className = 'cmLine';
        combined.innerHTML = newHtml;
        element.replaceWith(combined);
      }
    });
    
    toRemove.forEach((el) => {
      if (el.parentElement) {
        el.remove();
      }
    });
  });

  return songDiv.outerHTML;
};

const findPreviousNonEmptyLine = (lines: SongLine[], index: number): SongLine | null => {
  for (let i = index - 1; i >= 0; i--) {
    if (lines[i].type !== lineTypes.EMPTY_LINE) {
      return lines[i];
    }
  }
  return null;
};

const findNextNonEmptyLine = (lines: SongLine[], index: number): SongLine | null => {
  for (let i = index + 1; i < lines.length; i++) {
    if (lines[i].type !== lineTypes.EMPTY_LINE) {
      return lines[i];
    }
  }
  return null;
};

const shouldRemoveSpacerBetweenChordAndLyric = (lines: SongLine[], index: number): boolean => {
  if (lines[index].type !== lineTypes.EMPTY_LINE) {
    return false;
  }
  const previous = findPreviousNonEmptyLine(lines, index);
  const next = findNextNonEmptyLine(lines, index);
  return (
    !!previous &&
    !!next &&
    isChordLine(previous) &&
    isLyricLine(next) &&
    Array.isArray(next.model?.chordPositions) &&
    next.model.chordPositions.length > 0
  );
};

const cloneSong = (song: ParsedSong): ParsedSong => {
  if (typeof structuredClone === 'function') {
    return structuredClone(song);
  }
  return JSON.parse(JSON.stringify(song));
};

const hasLyricPositions = (line: LyricLine | null | undefined) => {
  return (
    !!line &&
    Array.isArray(line.model?.chordPositions) &&
    line.model.chordPositions.length > 0
  );
};

const flagChordAlignment = (lines: SongLine[]) => {
  lines.forEach((line, index) => {
    if (!isChordLine(line)) {
      return;
    }
    const nextLine = lines[index + 1];
    if (isLyricLine(nextLine) && hasLyricPositions(nextLine)) {
      line.model.hasPositionedChords = true;
      markChordPositions(line, nextLine);
    } else {
      line.model.hasPositionedChords = false;
      clearChordPositions(line);
    }
  });
};

const markChordPositions = (line: ChordLine, lyricLine: LyricLine) => {
  let chordIndex = 0;
  const maxPositions = lyricLine.model?.chordPositions?.length || 0;
  line.model.allBars?.forEach((bar) => {
    bar.allChords?.forEach((chord) => {
      chord.isPositioned = chordIndex < maxPositions;
      chordIndex++;
    });
  });
};

const clearChordPositions = (line: ChordLine) => {
  line.model.allBars?.forEach((bar) => {
    bar.allChords?.forEach((chord) => {
      chord.isPositioned = false;
    });
  });
};

export const prepareSongForRendering = (song: ParsedSong): ParsedSong => {
  if (!song?.allLines?.length) {
    return song;
  }
  const clonedSong = cloneSong(song);
  const filteredLines = clonedSong.allLines.filter((line, index, lines) => {
    return !shouldRemoveSpacerBetweenChordAndLyric(lines, index);
  });
  clonedSong.allLines = filteredLines;
  flagChordAlignment(clonedSong.allLines);
  return clonedSong;
};

