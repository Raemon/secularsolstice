'use client';

import type { Slide } from '../../../src/components/slides/types';
import SlideItem from '../../../src/components/slides/SlideItem';

type SongSlideData = {
  versionId: string;
  songTitle: string;
  versionLabel: string;
  slides: Slide[];
};

const ProgramSlidesView = ({slides}:{slides: SongSlideData[]}) => {
  if (slides.length === 0) {
    return (
      <div className="text-sm text-gray-400">
        No songs in program yet.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold">Program Slides</div>
      {slides.map((songData, songIndex) => (
        <div key={songData.versionId} className="space-y-2">
          {songData.slides.length === 0 ? (
            <div className="text-xs text-gray-500">No slides available</div>
          ) : (
            <div className="space-y-2">
              {songData.slides.map((slide, slideIndex) => (
                <SlideItem 
                  key={slideIndex} 
                  slide={slide} 
                  slideLabel={`Song ${songIndex + 1} - Slide ${slideIndex + 1}`}
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

