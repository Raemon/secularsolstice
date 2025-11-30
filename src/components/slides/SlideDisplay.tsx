'use client';

import type { Slide } from './types';
import SlideItem from './SlideItem';

/**
 * Displays a collection of slides as a preview/thumbnail view
 * Used in editors and viewers to show all slides at once
 */
const SlideDisplay = ({slides, slidePrefix}:{slides: Slide[], slidePrefix?: string}) => {
  if (!slides || slides.length === 0) {
    return <div className="text-xs text-gray-500">No slides generated</div>;
  }

  return (
    <div className="space-y-2">
      {slides.map((slide, slideIndex) => (
        <SlideItem
          key={slideIndex}
          slide={slide}
          slideLabel={`${slidePrefix || 'Slide'} ${slideIndex + 1}`}
        />
      ))}
    </div>
  );
};

export default SlideDisplay;

