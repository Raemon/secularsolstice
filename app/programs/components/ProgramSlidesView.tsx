'use client';

import SlideItem from '../../../src/components/slides/SlideItem';
import type { SongSlideData } from '../types';

const ProgramSlidesView = ({slides}:{slides: SongSlideData[]}) => {
  const processedSlides = slides.map(songData => {
    if (songData.tags.includes('speech')) {
      return {
        ...songData,
        slides: songData.slides.slice(0, 1)
      };
    }
    return songData;
  });
  
  if (processedSlides.length === 0) {
    return (
      <div className="text-sm text-gray-400">
        No songs in program yet.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold">Program Slides</div>
      {processedSlides.map((songData) => (
        <div key={songData.versionId} className="space-y-2">
          {songData.slides.length === 0 ? (
            <div className="text-xs text-gray-500">No slides available</div>
          ) : (
            <div className="space-y-2">
              {songData.slides.map((slide, slideIndex) => (
                <SlideItem 
                  key={slideIndex} 
                  slide={slide} 
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProgramSlidesView;

