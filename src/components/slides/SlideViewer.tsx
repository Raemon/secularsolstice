'use client';

import { useEffect, useRef, useState } from 'react';
import SlideItem from './SlideItem';
import type { Slide } from './types';

type SlideViewerProps = {
  slides: Slide[];
  title?: string;
  backgroundMovieUrl?: string | null;
  programTitleSlideIndices?: Set<number>;
  getBackgroundForSlide?: (slideIndex: number) => string | undefined;
  showControls?: boolean;
  className?: string;
  onSlideChange?: (slideIndex: number) => void;
};

const SlideViewer = ({slides, title, backgroundMovieUrl, programTitleSlideIndices, getBackgroundForSlide, showControls = true, className, onSlideChange}: SlideViewerProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const slidesMovieRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setCurrentSlide(0);
  }, [slides.length]);

  useEffect(() => {
    if (onSlideChange) {
      onSlideChange(currentSlide);
    }
  }, [currentSlide, onSlideChange]);

  useEffect(() => {
    const video = slidesMovieRef.current;
    if (!video) return;
    if (backgroundMovieUrl) {
      video.src = backgroundMovieUrl;
      video.load();
      video.play().catch(err => console.error('Error playing slides movie:', err));
    } else {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
  }, [backgroundMovieUrl]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (slides.length === 0) return;
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentSlide(prev => Math.max(prev - 1, 0));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides]);

  if (slides.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">No slides available</div>
      </div>
    );
  }

  const isProgramTitle = programTitleSlideIndices?.has(currentSlide) ?? false;
  const overlayOpacity = isProgramTitle ? .75 : 0.5;
  const backgroundImageUrl = backgroundMovieUrl ? undefined : getBackgroundForSlide?.(currentSlide);
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => console.error('Failed to enter fullscreen:', err));
      return;
    }
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => console.error('Failed to exit fullscreen:', err));
    }
  };

  return (
    <div ref={containerRef} className={className || "relative w-screen h-screen flex items-center justify-center"}>
      <style>
        {`
          .slideMeta {
            opacity: 0.65;
            font-style: italic;
            color: white;
          }
        `}
      </style>
      {backgroundMovieUrl && (
        <video ref={slidesMovieRef} className="absolute inset-0 w-full h-full object-cover" muted loop playsInline autoPlay preload="auto" style={{zIndex: 0}} />
      )}
      {backgroundMovieUrl && (
        <div className="absolute inset-0 bg-black" style={{opacity: overlayOpacity, zIndex: 1}} />
      )}
      {showControls && (
        <div className="fixed top-4 right-4 z-10 opacity-0 hover:opacity-100">
          <button onClick={toggleFullscreen} className="text-white text-xs bg-black bg-opacity-50 px-3 py-1 rounded">
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      )}
      <SlideItem slide={slides[currentSlide]} className={backgroundMovieUrl ? "w-screen h-screen flex items-center justify-center p-4 font-georgia bg-transparent" : "bg-black w-screen h-screen flex items-center justify-center p-4 font-georgia"} backgroundImageUrl={backgroundImageUrl} isProgramTitle={isProgramTitle} hasMovie={!!backgroundMovieUrl} />
      {showControls && (
        <div className="fixed bottom-4 right-4 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
          {currentSlide + 1} / {slides.length}
        </div>
      )}
    </div>
  );
};

export default SlideViewer;
