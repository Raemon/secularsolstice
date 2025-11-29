'use client';

import { useRef, useEffect, useState } from 'react';
import { ParsedLine, Slide } from './types';

const ContentEditor = ({htmlContent, setHtmlContent, rawHtml, slides, extractedFrames, onPaste}:{htmlContent: string, setHtmlContent: (value: string) => void, rawHtml: string, slides: Slide[], extractedFrames: string[], onPaste: (e: React.ClipboardEvent) => void}) => {
  const formattedRef = useRef<HTMLDivElement>(null);
  const rawRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<HTMLDivElement>(null);
  const [rawHtmlExpanded, setRawHtmlExpanded] = useState(false);
  
  const lines = slides.flat().filter((line: ParsedLine) => !line.isHr && !line.isEmpty);
  const imageCount = lines.filter((line: ParsedLine) => line.isImage).length;
  
  useEffect(() => {
    if (formattedRef.current && formattedRef.current.innerHTML !== htmlContent) {
      formattedRef.current.innerHTML = htmlContent;
    }
  }, [htmlContent]);
  
  useEffect(() => {
    if (rawRef.current) {
      rawRef.current.textContent = rawHtml;
    }
  }, [rawHtml]);
  
  const handleInput = () => {
    if (formattedRef.current) {
      setHtmlContent(formattedRef.current.innerHTML);
    }
  };
  
  return (
    <div className="mb-4">
      <div className="flex items-center mb-2">
        <h2 className="text-sm m-0">Paste Formatted Content</h2>
      </div>
      <div className={`grid grid-cols-1 gap-2 w-full min-w-0 h-[calc(100vh-50px)] ${rawHtmlExpanded ? 'lg:grid-cols-[2fr_2fr_200px]' : 'lg:grid-cols-[200px_2fr_2fr]'}`}>
        <div className={`flex flex-col flex-grow min-w-0 w-full h-full overflow-y-scroll ${rawHtmlExpanded ? 'order-1' : 'order-1'}`}>
          <div className="flex items-center justify-between mb-1 px-2 py-1">
            <h3 className="text-xs m-0">Raw HTML</h3>
            <span className="text-xs">{rawHtml.split('\n').length} lines</span>
          </div>
          <div ref={rawRef} onFocus={() => setRawHtmlExpanded(true)} onBlur={() => setRawHtmlExpanded(false)} tabIndex={0} className="flex-1 min-h-0 p-2 border text-xs font-mono overflow-y-auto overflow-x-hidden bg-gray-50 resize-y w-full box-border break-all whitespace-pre-wrap cursor-pointer focus:outline-none" data-placeholder="HTML will appear here..." />
        </div>
        <div className={`flex flex-col flex-grow min-w-0 w-full h-full overflow-y-scroll ${rawHtmlExpanded ? 'order-2' : 'order-2'}`}>
          <div className="flex items-center justify-between mb-1 px-2 py-1">
            <h3 className="text-xs m-0">Formatted Preview</h3>
            <span className="text-xs">{htmlContent ? 'Ready' : 'Empty'}</span>
          </div>
          <div ref={formattedRef} contentEditable onInput={handleInput} onPaste={onPaste} className="flex-1 min-h-0 p-2 border text-xs overflow-y-auto overflow-x-hidden resize-y w-full box-border focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:italic" data-placeholder="Paste your formatted content here..." />
        </div>
        <div className={`flex flex-col flex-grow min-w-0 w-full h-full overflow-y-scroll ${rawHtmlExpanded ? 'order-3' : 'order-3'}`}>
          <div className="flex items-center justify-between mb-1 px-2 py-1">
            <h3 className="text-xs m-0">Slides Preview</h3>
            <span className="text-xs">{slides.length} slides</span>
          </div>
          <div ref={slidesRef} className="flex-1 min-h-0 p-2 border text-xs overflow-y-auto overflow-x-hidden bg-gray-100 resize-y w-full box-border" data-placeholder="Slides will appear here...">
            {slides.length === 0 ? (
              <div className="text-gray-500 text-center py-10 italic">No slides to preview</div>
            ) : (
              slides.map((slide, index) => {
                const backgroundFrame = extractedFrames[index] || extractedFrames[extractedFrames.length - 1];
                const backgroundStyle = backgroundFrame ? {backgroundImage: `url('${backgroundFrame}')`, backgroundSize: 'cover', backgroundPosition: 'center'} : {background: 'var(--background-light)'};
                
                return (
                  <div key={index} className="mb-2 p-2 border last:mb-0 relative overflow-hidden min-h-[200px]" style={backgroundStyle}>
                    <div className="absolute inset-0 bg-black/40 p-2 flex flex-col">
                      <div className="flex flex-col flex-1 justify-center text-center">
                        {slide.map((line: ParsedLine, lineIndex: number) => {
                          if (line.isImage) {
                            return <div key={lineIndex} className="text-white/80 italic bg-black/30 px-1 py-0.5 text-center my-0.5">📷 Image{line.isSvg ? ' (SVG)' : ''}</div>;
                          } else if (line.isHeading) {
                            return <div key={lineIndex} className="font-semibold text-white mb-0.5 text-xs">{line.text}</div>;
                          } else if (line.text && line.text.trim()) {
                            return <div key={lineIndex} className="text-white/90 mb-0.5 text-xs">{line.text}</div>;
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-4 mt-2">
        <div className="text-xs">{lines.length} lines</div>
        <div className="text-xs">{slides.length} slides</div>
        <div className="text-xs">{imageCount} images</div>
      </div>
    </div>
  );
};

export default ContentEditor;

