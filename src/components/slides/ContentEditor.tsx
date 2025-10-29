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
    <div className="mb-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
      <div className="flex items-center mb-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm mr-4 flex-shrink-0">2</div>
        <h2 className="text-gray-900 font-semibold text-lg m-0">Paste Formatted Content</h2>
      </div>
      <div className={`grid grid-cols-1 gap-4 w-full mt-4 min-w-0 transition-all duration-500 ease-in-out h-[calc(100vh-50px)] ${rawHtmlExpanded ? 'lg:grid-cols-[2fr_2fr_200px]' : 'lg:grid-cols-[200px_2fr_2fr]'}`}>
        <div className={`flex flex-col flex-grow min-w-0 w-full h-full overflow-y-scroll transition-all duration-500 ease-in-out ${rawHtmlExpanded ? 'order-1' : 'order-1'}`}>
          <div className="flex items-center justify-between mb-2 px-4 py-2 bg-white rounded-md border border-gray-200">
            <h3 className="text-gray-900 font-semibold text-sm m-0">Raw HTML</h3>
            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-xs font-medium">{rawHtml.split('\n').length} lines</span>
          </div>
          <div ref={rawRef} onFocus={() => setRawHtmlExpanded(true)} onBlur={() => setRawHtmlExpanded(false)} tabIndex={0} className="flex-1 min-h-0 p-4 border-2 border-gray-200 rounded-lg text-sm font-mono transition-all duration-500 ease-in-out overflow-y-auto overflow-x-hidden bg-gray-50 resize-y w-full box-border break-all whitespace-pre-wrap text-[10px] cursor-pointer focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100" data-placeholder="HTML will appear here..." />
        </div>
        <div className={`flex flex-col flex-grow min-w-0 w-full h-full overflow-y-scroll transition-all duration-500 ease-in-out ${rawHtmlExpanded ? 'order-2' : 'order-2'}`}>
          <div className="flex items-center justify-between mb-2 px-4 py-2 bg-white rounded-md border border-gray-200">
            <h3 className="text-gray-900 font-semibold text-sm m-0">Formatted Preview</h3>
            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-xs font-medium">{htmlContent ? 'Ready' : 'Empty'}</span>
          </div>
          <div ref={formattedRef} contentEditable onInput={handleInput} onPaste={onPaste} className="flex-1 min-h-0 p-4 border-2 border-gray-200 rounded-lg text-sm transition-all duration-500 ease-in-out overflow-y-auto overflow-x-hidden bg-white resize-y w-full box-border focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:italic" data-placeholder="Paste your formatted content here..." />
        </div>
        <div className={`flex flex-col flex-grow min-w-0 w-full h-full overflow-y-scroll transition-all duration-500 ease-in-out ${rawHtmlExpanded ? 'order-3' : 'order-3'}`}>
          <div className="flex items-center justify-between mb-2 px-4 py-2 bg-white rounded-md border border-gray-200">
            <h3 className="text-gray-900 font-semibold text-sm m-0">Slides Preview</h3>
            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-xs font-medium">{slides.length} slides</span>
          </div>
          <div ref={slidesRef} className="flex-1 min-h-0 p-4 border-2 border-gray-200 rounded-lg text-sm transition-all duration-500 ease-in-out overflow-y-auto overflow-x-hidden bg-gray-100 resize-y w-full box-border" data-placeholder="Slides will appear here...">
            {slides.length === 0 ? (
              <div className="text-gray-500 text-center py-10 italic">No slides to preview</div>
            ) : (
              slides.map((slide, index) => {
                const backgroundFrame = extractedFrames[index] || extractedFrames[extractedFrames.length - 1];
                const backgroundStyle = backgroundFrame ? {backgroundImage: `url('${backgroundFrame}')`, backgroundSize: 'cover', backgroundPosition: 'center'} : {background: 'var(--background-light)'};
                
                return (
                  <div key={index} className="mb-4 p-0 border border-gray-200 rounded-lg bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-px last:mb-0 relative overflow-hidden min-h-[200px]" style={backgroundStyle}>
                    <div className="absolute inset-0 bg-black/40 p-4 flex flex-col">
                      <div className="flex flex-col flex-1 justify-center text-center">
                        {slide.map((line: ParsedLine, lineIndex: number) => {
                          if (line.isImage) {
                            return <div key={lineIndex} className="text-white/80 italic bg-black/30 px-2 py-1 rounded border border-dashed border-white/30 text-center my-1">📷 Image{line.isSvg ? ' (SVG)' : ''}</div>;
                          } else if (line.isHeading) {
                            return <div key={lineIndex} className="font-semibold text-white mb-1 text-sm drop-shadow-lg">{line.text}</div>;
                          } else if (line.text && line.text.trim()) {
                            return <div key={lineIndex} className="text-white/90 mb-1 drop-shadow-lg">{line.text}</div>;
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
      <div className="flex gap-4 mt-2 px-4 py-2 bg-white rounded-md border border-gray-200">
        <div className="flex flex-col items-center flex-1">
          <div className="font-semibold text-indigo-600 text-lg">{lines.length}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Lines</div>
        </div>
        <div className="flex flex-col items-center flex-1">
          <div className="font-semibold text-indigo-600 text-lg">{slides.length}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Slides</div>
        </div>
        <div className="flex flex-col items-center flex-1">
          <div className="font-semibold text-indigo-600 text-lg">{imageCount}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Images</div>
        </div>
      </div>
    </div>
  );
};

export default ContentEditor;

