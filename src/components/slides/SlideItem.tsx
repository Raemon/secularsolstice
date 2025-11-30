'use client';

import type { Slide, ParsedLine } from './types';

/**
 * Renders a single slide with its content lines
 * Used for preview/thumbnail views (not full-screen presentation)
 */
const SlideItem = ({slide, slideLabel, className}:{slide: Slide, slideLabel?: string, className?: string}) => {
  return (
    <div className={className || "bg-black p-2 text-sm"}>
      {slideLabel && <div className="text-xs text-gray-500 mb-1">{slideLabel}</div>}
      <div className="space-y-1">
        {slide.map((line: ParsedLine, lineIndex: number) => {
          if (line.isImage) {
            return <img key={lineIndex} src={line.src} alt="" className="max-w-full h-auto" />;
          }
          if (line.isHeading) {
            return <div key={lineIndex} className="font-bold">{line.text}</div>;
          }
          if (line.isEmpty) {
            return <div key={lineIndex}>&nbsp;</div>;
          }
          return <div key={lineIndex}>{line.text}</div>;
        })}
      </div>
    </div>
  );
};

export default SlideItem;

