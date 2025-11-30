'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { parseHTMLContent, groupIntoSlides } from '../../../../src/components/slides/utils';
import type { Slide } from '../../../../src/components/slides/types';
import { extractLyrics } from '../../../../lib/lyricsExtractor';
import type { SongVersion } from '../../../songs/types';

type SongSlideData = {
  versionId: string;
  songTitle: string;
  versionLabel: string;
  slides: Slide[];
};

const SlideItem = ({slide, slideIndex}:{slide: Slide, slideIndex: number}) => {
  return (
    <div className="bg-black p-8 text-white text-2xl min-h-screen flex items-center justify-center">
      <div className="space-y-2 max-w-4xl w-full">
        {slide.map((line, lineIndex) => {
          if (line.isImage) {
            return <img key={lineIndex} src={line.src} alt="" className="max-w-full h-auto" />;
          }
          if (line.isHeading) {
            return <div key={lineIndex} className="font-bold text-4xl text-center">{line.text}</div>;
          }
          return <div key={lineIndex} className="text-center">{line.text}</div>;
        })}
      </div>
    </div>
  );
};

const SongSlidesPage = () => {
  const params = useParams();
  const versionId = params.versionId as string;
  const [slideData, setSlideData] = useState<SongSlideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch(`/api/songs/versions/${versionId}`);
        if (!response.ok) {
          throw new Error('Failed to load version');
        }
        const data = await response.json();
        const version: SongVersion = data.version;
        
        const convertToLyricsOnly = (content: string, label: string): string => {
          try {
            const lyrics = extractLyrics(content, label);
            return `<div>${lyrics.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('')}</div>`;
          } catch (err) {
            console.error('Failed to extract lyrics:', err);
            return content;
          }
        };
        
        let slides: Slide[] = [];
        const linesPerSlide = 8;
        
        let contentToProcess = '';
        if (version.content) {
          contentToProcess = convertToLyricsOnly(version.content, version.label);
        } else if (version.renderedContent) {
          contentToProcess = version.renderedContent;
        }
        
        if (contentToProcess) {
          const lines = parseHTMLContent(contentToProcess);
          slides = groupIntoSlides(lines, linesPerSlide);
          
          const titleSlide: Slide = [{ text: data.songTitle || 'Song', isHeading: true, level: 1 }];
          slides.unshift(titleSlide);
        }
        
        setSlideData({
          versionId: version.id,
          songTitle: data.songTitle || 'Song',
          versionLabel: version.label,
          slides: slides,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load slides');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVersion();
  }, [versionId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!slideData) return;
      
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlide(prev => Math.min(prev + 1, slideData.slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlide(prev => Math.max(prev - 1, 0));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slideData]);

  if (loading) {
    return <div className="p-4">Loading slides...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (!slideData || slideData.slides.length === 0) {
    return <div className="p-4">No slides available</div>;
  }

  return (
    <div className="relative">
      <SlideItem slide={slideData.slides[currentSlide]} slideIndex={currentSlide} />
      <div className="fixed bottom-4 right-4 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
        {currentSlide + 1} / {slideData.slides.length}
      </div>
    </div>
  );
};

export default SongSlidesPage;

