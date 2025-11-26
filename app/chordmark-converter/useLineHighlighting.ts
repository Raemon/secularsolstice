import { useEffect, RefObject } from 'react';

/**
 * Custom hook to highlight the active line in rendered chordmark content.
 * Updates DOM attributes to mark the current line for CSS styling.
 */
export const useLineHighlighting = (
  contentRef: RefObject<HTMLElement | null>,
  lineIndex: number | null
) => {
  useEffect(() => {
    if (!contentRef.current || lineIndex === null) return;
    
    const container = contentRef.current;
    
    // Remove all existing active markers
    const allLines = container.querySelectorAll('[data-line-index]');
    allLines.forEach(line => line.removeAttribute('data-line-active'));
    
    // Add active marker to current line
    const activeLine = container.querySelector(`[data-line-index="${lineIndex}"]`);
    if (activeLine) {
      activeLine.setAttribute('data-line-active', 'true');
    }
  }, [contentRef, lineIndex]);
};

