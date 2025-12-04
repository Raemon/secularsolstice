'use client';

import type { Slide, ParsedLine } from './types';

/**
 * Renders a single slide for full-screen presentation mode
 * Larger text, centered, optimized for projection
 */
const FullScreenSlideItem = ({slide, backgroundImageUrl, backgroundOpacity = 0.5}:{slide: Slide, backgroundImageUrl?: string, backgroundOpacity?: number}) => {
  const backgroundStyle = backgroundImageUrl ? {backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center'} : {};
  const overlayStyle = backgroundImageUrl ? {position: 'absolute' as const, inset: 0, backgroundColor: 'black', opacity: 1 - backgroundOpacity} : {};
  return (
    <div className="bg-black text-white text-2xl w-screen h-screen flex items-center justify-center" style={{...backgroundStyle, position: 'relative'}}>
      {backgroundImageUrl && <div style={overlayStyle} />}
      <div className="w-full h-full aspect-[16/9] max-w-full max-h-full flex items-center justify-center p-8" style={{margin: 'auto', position: 'relative', zIndex: 1}}>
        <div className="space-y-2 max-w-4xl w-full">
          {slide.map((line: ParsedLine, lineIndex: number) => {
            if (line.isImage) {
              return <img key={lineIndex} src={line.src} alt="" className="max-w-full h-auto mx-auto" />;
            }
            if (line.isHeading) {
              return <div key={lineIndex} className="font-bold text-4xl text-center">{line.text}</div>;
            }
            if (line.isEmpty) {
              return <div key={lineIndex} className="text-center">&nbsp;</div>;
            }
            if (line.isSlideMeta) {
              return <div key={lineIndex} className="slideMeta text-center">{line.text}</div>;
            }
            return <div key={lineIndex} className="text-center">{line.text}</div>;
          })}
        </div>
      </div>
    </div>
  );
};

export default FullScreenSlideItem;

