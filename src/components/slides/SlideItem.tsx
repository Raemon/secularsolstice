'use client';

import { Slide, ParsedLine } from './types';

/**
 * Renders a single slide with its content lines
 * Used for preview/thumbnail views (not full-screen presentation)
 */
const SlideItem = ({slide, className, backgroundImageUrl, backgroundOpacity = 0.5}:{slide: Slide, className?: string, backgroundImageUrl?: string, backgroundOpacity?: number}) => {
  const backgroundStyle = backgroundImageUrl ? {backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center'} : {};
  const overlayStyle = backgroundImageUrl ? {position: 'absolute' as const, inset: 0, backgroundColor: 'black', opacity: 1 - backgroundOpacity} : {};
  return (
    <div>
      <div className={className || "bg-black aspect-[16/9] flex items-center justify-center p-4 font-georgia"} style={{fontSize: 'clamp(0.75rem, 1.5vw, 1.75rem)', ...backgroundStyle, position: 'relative'}}>
        {backgroundImageUrl && <div style={overlayStyle} />}
        <div className="space-y-1 text-center" style={{position: 'relative', zIndex: 1}}> 
          {slide.map((line: ParsedLine, lineIndex: number) => {
            if (line.isImage) {
              return <img key={lineIndex} src={line.src} alt="" className="max-w-full h-auto mx-auto" />; 
            }
            if (line.isHeading) {
              return <div key={lineIndex} style={{fontSize: 'clamp(1.5rem, 3.625vw, 5rem)'}}>{line.text?.replace(/[_]/g, ' ')}</div>;
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

