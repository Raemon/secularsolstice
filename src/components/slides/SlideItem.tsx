'use client';

import { Slide, ParsedLine } from './types';

/**
 * Renders a single slide with its content lines
 * Used for preview/thumbnail views (not full-screen presentation)
 */
const SlideItem = ({slide, slideLabel, className}:{slide: Slide, slideLabel?: string, className?: string}) => {
  return (
    <div>
      {slideLabel && <div className="text-xs text-gray-500 mb-1">{slideLabel}</div>}
      <div className={className || "bg-black text-sm aspect-[16/9] flex items-center justify-center p-4"}>
        <div className="space-y-1 text-center">
          {slide.map((line: ParsedLine, lineIndex: number) => {
            if (line.isImage) {
              return <img key={lineIndex} src={line.src} alt="" className="max-w-full h-auto mx-auto" />;
            }
            if (line.isHeading) {
              return <div key={lineIndex} className="font-bold">{line.text}</div>;
            }
            if (line.isEmpty) {
              return <div key={lineIndex}>&nbsp;</div>;
            }
            if (line.isSlideMeta) {
              return <div key={lineIndex} className="slideMeta">{line.text}</div>;
            }
            return <div key={lineIndex}>{line.text}</div>;
          })}
        </div>
      </div>
    </div>
  );
};

export default SlideItem;

