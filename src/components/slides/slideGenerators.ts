import { extractLyrics } from '../../../lib/lyricsExtractor';
import { parseHTMLContent, groupIntoSlides } from './utils';
import type { Slide } from './types';

/**
 * Configuration for slide generation
 */
export type SlideGenerationConfig = {
  linesPerSlide?: number;
  format?: 'chordmark' | 'lilypond' | 'html';
};

const DEFAULT_LINES_PER_SLIDE = 8;

/**
 * Escapes HTML special characters to prevent XSS and rendering issues
 */
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Converts lyrics text to HTML format suitable for slide parsing
 */
export const lyricsToHtml = (lyrics: string): string => {
  return `<div>${lyrics
    .split('\n')
    .map(line => `<p>${line ? escapeHtml(line) : '&nbsp;'}</p>`)
    .join('')}</div>`;
};

/**
 * Generates slides from chordmark content
 * Extracts lyrics only and groups into slides
 */
export const generateSlidesFromChordmark = (
  content: string,
  config: SlideGenerationConfig = {}
): Slide[] => {
  if (!content || !content.trim()) return [];

  const linesPerSlide = config.linesPerSlide ?? DEFAULT_LINES_PER_SLIDE;

  try {
    // Convert content to lyrics-only format using extractLyrics
    const lyrics = extractLyrics(content, 'chordmark');
    const htmlContent = lyricsToHtml(lyrics);

    // Parse HTML content and group into slides
    const lines = parseHTMLContent(htmlContent);
    return groupIntoSlides(lines, linesPerSlide);
  } catch (err) {
    console.error('Failed to generate slides from chordmark:', err);
    return [];
  }
};

/**
 * Generates slides from HTML content
 */
export const generateSlidesFromHtml = (
  htmlContent: string,
  config: SlideGenerationConfig = {}
): Slide[] => {
  if (!htmlContent || !htmlContent.trim()) return [];

  const linesPerSlide = config.linesPerSlide ?? DEFAULT_LINES_PER_SLIDE;

  try {
    const lines = parseHTMLContent(htmlContent);
    return groupIntoSlides(lines, linesPerSlide);
  } catch (err) {
    console.error('Failed to generate slides from HTML:', err);
    return [];
  }
};

/**
 * Generates slides from any content based on format
 */
export const generateSlides = (
  content: string,
  config: SlideGenerationConfig = {}
): Slide[] => {
  const format = config.format || 'chordmark';

  switch (format) {
    case 'chordmark':
      return generateSlidesFromChordmark(content, config);
    case 'html':
      return generateSlidesFromHtml(content, config);
    case 'lilypond':
      // For lilypond, extract lyrics then process as chordmark
      try {
        const lyrics = extractLyrics(content, 'lilypond');
        const htmlContent = lyricsToHtml(lyrics);
        return generateSlidesFromHtml(htmlContent, config);
      } catch (err) {
        console.error('Failed to generate slides from lilypond:', err);
        return [];
      }
    default:
      return [];
  }
};

