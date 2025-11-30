import { parseSong, renderSong, type ParsedSong } from 'chord-mark';
import { serializeToChordmark, combineChordsAndLyrics, extractTextFromHTML, convertCustomFormatToChordmark, prepareSongForRendering, prepareSongForChordsWithMeta, removeRepeatBarIndicators } from '../app/chordmark-converter/utils';
import type { RenderedContent } from './songsRepository';

// Server-side DOM parsing is not available, so we skip adding line indices and bracket meta classes
// Those are only needed for client-side interactivity


export const generateAllChordmarkRenderTypes = (content: string): RenderedContent => {
  if (!content || !content.trim()) {
    return {};
  }

  try {
    // Parse the chordmark content
    let textToParse = content.trim();
    
    // Extract text from HTML if needed
    if (textToParse.startsWith('<') && textToParse.includes('>')) {
      textToParse = extractTextFromHTML(textToParse);
    }

    if (!textToParse) {
      return {};
    }

    let parsedSong: ParsedSong | null = null;
    try {
      parsedSong = removeRepeatBarIndicators(parseSong(textToParse));
    } catch (parseErr) {
      // Try custom format conversion
      const customResult = convertCustomFormatToChordmark(textToParse);
      if (customResult !== textToParse) {
        try {
          parsedSong = removeRepeatBarIndicators(parseSong(customResult));
        } catch {
          // If parsing fails, return empty object
          return {};
        }
      } else {
        return {};
      }
    }

    // removeRepeatBarIndicators can return null, so we need to check
    if (!parsedSong) {
      return {};
    }

    // TypeScript doesn't narrow the type after the above check, so use non-null assertion
    return generateRenderedOutputs(parsedSong as ParsedSong);
  } catch (err) {
    console.error('Failed to generate chordmark render types:', err);
    return {};
  }
};

// Helper function that accepts non-null ParsedSong
function generateRenderedOutputs(song: ParsedSong): RenderedContent {
  // Prepare songs for rendering
  const songForRendering = prepareSongForRendering(song);
  const songForChordsWithMeta = prepareSongForChordsWithMeta(song);

  // Generate all render types
  const htmlFull = renderSong(songForRendering, { chartType: 'all', accidentalsType: 'auto' });
  const htmlChordsOnly = songForChordsWithMeta 
    ? renderSong(songForChordsWithMeta, { chartType: 'all', alignChordsWithLyrics: false, accidentalsType: 'auto' })
    : renderSong(songForRendering, { chartType: 'chords', alignChordsWithLyrics: false, accidentalsType: 'auto' });
  const htmlLyricsOnly = renderSong(songForRendering, { chartType: 'lyrics', accidentalsType: 'auto' });
  
  // Generate combined chords first lyric line version
  let htmlChordsFirstLyricLine = htmlFull;
  try {
    htmlChordsFirstLyricLine = combineChordsAndLyrics(htmlFull);
  } catch {
    // If combining fails, just use the full HTML
  }

  // Generate plain text version
  const plainText = serializeToChordmark(song);

  return {
    htmlFull,
    htmlChordsOnly,
    htmlLyricsOnly,
    htmlChordsFirstLyricLine,
    plainText,
  };
}
