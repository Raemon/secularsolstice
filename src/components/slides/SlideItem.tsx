'use client';

import { useEffect, useRef, useState } from 'react';
import { Slide, ParsedLine } from './types';

/**
 * Renders a single slide with its content lines
 * Used for preview/thumbnail views (not full-screen presentation)
 */
const SlideItem = ({slide, className, backgroundImageUrl, backgroundOpacity = 0.5, isProgramTitle = false}:{slide: Slide, className?: string, backgroundImageUrl?: string, backgroundOpacity?: number, isProgramTitle?: boolean}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const backgroundStyle = backgroundImageUrl ? {backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center'} : {};
  const overlayStyle = backgroundImageUrl ? {position: 'absolute' as const, inset: 0, backgroundColor: 'black', opacity: 1 - backgroundOpacity} : {};
  
  const baseScale = isProgramTitle ? 0.2 : 0.05;
  const headingScale = isProgramTitle ? 0.08 : 0.04;

  const getSize = (scale: number, fallback: string) => containerHeight !== null ? `${containerHeight * scale}px` : fallback;
  const baseFontSize = getSize(baseScale, isProgramTitle ? '2.5vh' : '1.5vh');
  const headingFontSize = getSize(headingScale, isProgramTitle ? '7vh' : '3.625vh');
  
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const updateSize = () => setContainerHeight(node.clientHeight);
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);
  
  return (
    <div>
      <div ref={containerRef} className={className || "bg-black aspect-[16/9] flex items-center justify-center p-4 font-georgia"} style={{fontSize: baseFontSize, ...backgroundStyle, position: 'relative'}}>
        {backgroundImageUrl && <div style={overlayStyle} />}
        <div className="space-y-1 text-center" style={{position: 'relative', zIndex: 1}}> 
          {slide.map((line: ParsedLine, lineIndex: number) => {
            if (line.isImage) {
              return <img key={lineIndex} src={line.src} alt="" className="max-w-full h-auto mx-auto" />; 
            }
            if (line.isHeading) {
              return <div key={lineIndex} style={{fontSize: headingFontSize, textShadow: '0 0 10px rgba(0, 0, 0, .8)'}}>{line.text?.replace(/[_]/g, ' ')}</div>;
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

