'use client';

import { useEffect, useState, useMemo } from 'react';
import { parseHTMLContent, groupIntoSlides } from '../../../src/components/slides/utils';
import type { Slide, ParsedLine } from '../../../src/components/slides/types';
import type { SongVersion } from '../../songs/types';
import { extractLyrics } from '../../../lib/lyricsExtractor';

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
};

type SongSlideData = {
  versionId: string;
  songTitle: string;
  versionLabel: string;
  slides: Slide[];
};

const convertToLyricsOnly = (content: string, label: string): string => {
  try {
    // Extract lyrics from any supported format (lilypond, chordmark, ultimate guitar)
    const lyrics = extractLyrics(content, label);
    // Wrap in minimal HTML for parsing
    return `<div>${lyrics.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('')}</div>`;
  } catch (err) {
    console.error('Failed to extract lyrics:', err);
    return content;
  }
};

const SlideItem = ({slide, slideIndex, songIndex}:{slide: Slide, slideIndex: number, songIndex: number}) => {
  return (
    <div className="bg-gray-50 p-2 text-sm">
      <div className="text-xs text-gray-500 mb-1">Song {songIndex + 1} - Slide {slideIndex + 1}</div>
      <div className="space-y-1">
        {slide.map((line: ParsedLine, lineIndex: number) => {
          if (line.isImage) {
            return <img key={lineIndex} src={line.src} alt="" className="max-w-full h-auto" />;
          }
          if (line.isHeading) {
            return <div key={lineIndex} className="font-bold">{line.text}</div>;
          }
          return <div key={lineIndex}>{line.text}</div>;
        })}
      </div>
    </div>
  );
};

const ProgramSlidesView = ({elementIds, versionMap, linesPerSlide=8}:{elementIds: string[], versionMap: Record<string, VersionOption>, linesPerSlide?: number}) => {
  const [fullVersions, setFullVersions] = useState<Record<string, SongVersion>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVersions = async () => {
      if (elementIds.length === 0) {
        setFullVersions({});
        return;
      }
      
      setLoading(true);
      const newFullVersions: Record<string, SongVersion> = {};
      
      for (const versionId of elementIds) {
        try {
          const response = await fetch(`/api/songs/versions/${versionId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.version) {
              newFullVersions[versionId] = data.version;
            }
          }
        } catch (err) {
          console.error(`Failed to fetch version ${versionId}:`, err);
        }
      }
      
      setFullVersions(newFullVersions);
      setLoading(false);
    };
    
    fetchVersions();
  }, [elementIds]);
  
  const allSlides = useMemo(() => {
    const result: SongSlideData[] = [];
    
    for (const versionId of elementIds) {
      const version = versionMap[versionId];
      const fullVersion = fullVersions[versionId];
      if (!version) continue;
      
      let slides: Slide[] = [];
      if (fullVersion) {
        try {
          let contentToProcess = '';
          
          // Convert all file types to lyrics-only (chordmark, lilypond, ultimate guitar tabs)
          if (fullVersion.content) {
            contentToProcess = convertToLyricsOnly(fullVersion.content, version.label);
          } else if (fullVersion.renderedContent) {
            contentToProcess = fullVersion.renderedContent;
          }
          
          if (contentToProcess) {
            const lines = parseHTMLContent(contentToProcess);
            slides = groupIntoSlides(lines, linesPerSlide);
            
            // Prepend title slide at the beginning
            const titleSlide: Slide = [{ text: version.songTitle, isHeading: true, level: 1 }];
            slides.unshift(titleSlide);
          }
        } catch (err) {
          console.error(`Failed to parse content for ${versionId}:`, err);
        }
      }
      
      result.push({
        versionId: version.id,
        songTitle: version.songTitle,
        versionLabel: version.label,
        slides: slides,
      });
    }
    
    return result;
  }, [elementIds, versionMap, fullVersions, linesPerSlide]);
  
  if (elementIds.length === 0) {
    return (
      <div className="text-sm text-gray-600">
        No songs in program yet.
      </div>
    );
  }
  
  if (loading) {
    return <div className="text-sm">Loading slides...</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold">Program Slides</div>
      {allSlides.map((songData, songIndex) => (
        <div key={songData.versionId} className="space-y-2">
          <div className="text-sm font-semibold">{songData.songTitle} - {songData.versionLabel}</div>
          {songData.slides.length === 0 ? (
            <div className="text-xs text-gray-500">No slides available</div>
          ) : (
            <div className="space-y-2">
              {songData.slides.map((slide, slideIndex) => (
                <SlideItem key={slideIndex} slide={slide} slideIndex={slideIndex} songIndex={songIndex} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProgramSlidesView;

