'use client';

import SlideDisplay from '../../src/components/slides/SlideDisplay';
import { Slide } from '../../src/components/slides/types';
import { ChordmarkViewMode } from './ChordmarkRenderer';

const ChordmarkContent = ({error, content, mode, finalOutputs}: {error: string | null, content: string, mode: ChordmarkViewMode, finalOutputs: {htmlFull: string; htmlChordsOnly: string; htmlLyricsOnly: string; slides?: Slide[]; renderError: string | null}}) => {
  if (error) {
    return <pre className="text-xs font-mono whitespace-pre-wrap">{content}</pre>;
  }
  
  if (mode === 'raw') {
    return <pre className="text-xs font-mono whitespace-pre-wrap">{content}</pre>;
  }

  // Slides view: display slides as they would appear in a presentation (same as ProgramSlidesView)
  if (mode === 'slides') {
    return <SlideDisplay slides={finalOutputs.slides || []} />;
  }

  // Side-by-side view: chords on left, lyrics on right
  if (mode === 'one-line') {
    if (!finalOutputs.htmlChordsOnly && !finalOutputs.htmlLyricsOnly) {
      return <pre className="text-xs font-mono whitespace-pre-wrap">{content}</pre>;
    }
    return (
      <div className="flex gap-4">
        <div className="flex-0 min-w-0" style={{ flex: '0 0 auto', minWidth: '18ch' }}>
          {/* <div className=" mb-1">Chords</div> */}
          <div className="styled-chords text-xs font-mono" dangerouslySetInnerHTML={{ __html: finalOutputs.htmlChordsOnly }} />
        </div>
        <div className="flex-1 min-w-0">
          {/* <div className="mb-1">Lyrics</div> */}
          <div className="styled-chordmark font-mono text-xs" dangerouslySetInnerHTML={{ __html: finalOutputs.htmlLyricsOnly }} />
        </div>
      </div>
    );
  }

  let html = '';
  if (mode === 'lyrics+chords') {
    html = finalOutputs.htmlFull;
  } else if (mode === 'lyrics') {
    html = finalOutputs.htmlLyricsOnly;
  } else if (mode === 'chords') {
    html = finalOutputs.htmlChordsOnly;
  }

  if (!html) {
    return <pre className="text-xs font-mono whitespace-pre-wrap">{content}</pre>;
  }

  // Don't apply CSS styling for chords-only mode
  if (mode === 'chords') {
    return <div className="text-xs font-mono" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return <div className="styled-chordmark text-xs" dangerouslySetInnerHTML={{ __html: html }} />;
};

export default ChordmarkContent;

