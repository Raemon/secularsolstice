'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SlideViewer from '../../../../../src/components/slides/SlideViewer';
import { generateSlidesFromHtml, lyricsToHtml } from '../../../../../src/components/slides/slideGenerators';
import type { Slide } from '../../../../../src/components/slides/types';
import { extractLyrics } from '../../../../../lib/lyricsExtractor';

type SongSlideData = {
  versionId: string;
  songTitle: string;
  versionLabel: string;
  slides: Slide[];
  slidesMovieUrl?: string | null;
  slideMovieStart?: number | null;
};

const SongSlidesPage = () => {
  const params = useParams();
  const versionId = params.versionId as string;
  const [slideData, setSlideData] = useState<SongSlideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backgroundMovieUrl, setBackgroundMovieUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch(`/api/songs/versions/${versionId}`);
        if (!response.ok) {
          throw new Error('Failed to load version');
        }
        const data = await response.json();
        const version = data.version;
        const songTitle = version.songTitle || 'Song';
        
        let slides: Slide[] = [];
        const linesPerSlide = 10;
        
        try {
          let contentToProcess = '';
          
          if (version.content) {
            const lyrics = extractLyrics(version.content, version.label);
            contentToProcess = lyricsToHtml(lyrics);
          } else if (version.renderedContent) {
            contentToProcess = version.renderedContent.htmlLyricsOnly || version.renderedContent.htmlFull || version.renderedContent.legacy || '';
          }
          
          if (contentToProcess) {
            slides = generateSlidesFromHtml(contentToProcess, { linesPerSlide });
            
            const titleSlide: Slide = [{ text: songTitle, isHeading: true, level: 1 }];
            slides.unshift(titleSlide);
          }
        } catch (err) {
          console.error(`Failed to parse content for ${versionId}:`, err);
        }
        
        setSlideData({
          versionId: version.id,
          songTitle: songTitle,
          versionLabel: version.label,
          slides: slides,
          slidesMovieUrl: version.slidesMovieUrl,
          slideMovieStart: version.slideMovieStart ?? null,
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

  const handleSlideChange = (currentSlide: number) => {
    if (!slideData) return;
    const startAt = slideData.slideMovieStart ?? 1;
    if (slideData.slidesMovieUrl && currentSlide >= startAt) {
      if (backgroundMovieUrl !== slideData.slidesMovieUrl) {
        setBackgroundMovieUrl(slideData.slidesMovieUrl);
      }
    } else {
      if (backgroundMovieUrl !== null) {
        setBackgroundMovieUrl(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading slides...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!slideData || slideData.slides.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">No slides available</div>
      </div>
    );
  }

  const programTitleSlideIndices = new Set<number>([0]);

  return (
    <SlideViewer slides={slideData.slides} title={slideData.songTitle} backgroundMovieUrl={backgroundMovieUrl} programTitleSlideIndices={programTitleSlideIndices} showControls={true} onSlideChange={handleSlideChange} />
  );
};

export default SongSlidesPage;
