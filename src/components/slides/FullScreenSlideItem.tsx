'use client';

import type { Slide, ParsedLine } from './types';

/**
 * Renders a single slide for full-screen presentation mode
 * Larger text, centered, optimized for projection
 */
const FullScreenSlideItem = ({slide}:{slide: Slide}) => {
  return (
    <div className="bg-black p-8 text-white text-2xl min-h-screen flex items-center justify-center">
      <div className="space-y-2 max-w-4xl w-full">
        {slide.map((line: ParsedLine, lineIndex: number) => {
          if (line.isImage) {
            return <img key={lineIndex} src={line.src} alt="" className="max-w-full h-auto" />;
          }
          if (line.isHeading) {
            return <div key={lineIndex} className="font-bold text-4xl text-center">{line.text}</div>;
          }
          if (line.isEmpty) {
            return <div key={lineIndex} className="text-center">&nbsp;</div>;
          }
          return <div key={lineIndex} className="text-center">{line.text}</div>;
        })}
      </div>
    </div>
  );
};

export default FullScreenSlideItem;

