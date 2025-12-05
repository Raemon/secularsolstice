'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import SlideItem from '../../../../src/components/slides/SlideItem';
import { generateSlidesFromHtml } from '../../../../src/components/slides/slideGenerators';
import { extractFrames } from '../../../../src/components/slides/utils';
import type { Slide } from '../../../../src/components/slides/types';
import { extractLyrics } from '../../../../lib/lyricsExtractor';
import type { Program, VersionOption, SongSlideData } from '../../types';
import type { SongVersion } from '../../../songs/types';

type ProgramSlidesProps = {
  programId: string;
};

const ProgramSlides = ({ programId }: ProgramSlidesProps) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [fullVersions, setFullVersions] = useState<Record<string, SongVersion>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalVersionsToLoad, setTotalVersionsToLoad] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [programsResponse, versionsResponse] = await Promise.all([
          fetch('/api/programs'),
          fetch('/api/song-versions'),
        ]);

        if (!programsResponse.ok || !versionsResponse.ok) {
          throw new Error('Failed to load data');
        }

        const programsData = await programsResponse.json();
        const versionsData = await versionsResponse.json();

        setPrograms(programsData.programs || []);
        setVersions(versionsData.versions || []);
        setError(null);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load slides');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [programId]);

  const programMap = useMemo(() => {
    const map: Record<string, Program> = {};
    programs.forEach((program) => {
      map[program.id] = program;
    });
    return map;
  }, [programs]);

  const versionMap = useMemo(() => {
    const map: Record<string, VersionOption> = {};
    versions.forEach((version) => {
      map[version.id] = version;
    });
    return map;
  }, [versions]);

  const selectedProgram = programId ? programMap[programId] ?? null : null;

  useEffect(() => {
    if (selectedProgram?.id) {
      fetch(`/api/programs/${selectedProgram.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.program?.videoUrl) {
            setVideoUrl(data.program.videoUrl);
          }
        })
        .catch(err => console.error('Failed to fetch program details:', err));
    }
  }, [selectedProgram?.id]);

  useEffect(() => {
    if (!selectedProgram) return;

    const collectVersionIds = (program: Program | null, visited: Set<string> = new Set()): string[] => {
      if (!program || visited.has(program.id)) {
        return [];
      }
      visited.add(program.id);
      let ids: string[] = [...program.elementIds];
      for (const childId of program.programIds) {
        const childProgram = programMap[childId] || null;
        ids = ids.concat(collectVersionIds(childProgram, visited));
      }
      visited.delete(program.id);
      return ids;
    };

    const versionIdArray = Array.from(new Set<string>(collectVersionIds(selectedProgram)));
    setTotalVersionsToLoad(versionIdArray.length);
    
    if (versionIdArray.length > 0) {
      fetch('/api/songs/versions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionIds: versionIdArray })
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch versions batch');
          }
          return response.json();
        })
        .then((data) => {
          if (data && data.versions) {
            setFullVersions(data.versions);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch versions batch:', err);
        });
    }
  }, [selectedProgram, programMap]);

  const loadedVersionsCount = Object.keys(fullVersions).length;
  const isFullyLoaded = totalVersionsToLoad > 0 && loadedVersionsCount >= totalVersionsToLoad;

  const allSlides = useMemo(() => {
    if (!selectedProgram) return [];
    
    const convertToLyricsOnly = (content: string, label: string): string => {
      try {
        const lyrics = extractLyrics(content, label);
        return `<div>${lyrics.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('')}</div>`;
      } catch (err) {
        console.error('Failed to extract lyrics:', err);
        return content;
      }
    };
    
    const linesPerSlide = 10;

    const buildSongSlides = (versionId: string): SongSlideData | null => {
      const version = versionMap[versionId];
      if (!version) {
        return null;
      }
      const fullVersion = fullVersions[versionId];
      let slides: Slide[] = [];
      if (fullVersion) {
        try {
          let contentToProcess = '';
          
          if (fullVersion.content) {
            contentToProcess = convertToLyricsOnly(fullVersion.content, version.label);
          } else if (fullVersion.renderedContent) {
            contentToProcess = fullVersion.renderedContent.htmlLyricsOnly || fullVersion.renderedContent.htmlFull || fullVersion.renderedContent.legacy || '';
          }
          
          if (contentToProcess) {
            slides = generateSlidesFromHtml(contentToProcess, { linesPerSlide });
            
            const titleSlide: Slide = [{ text: version.songTitle, isHeading: true, level: 1 }];
            slides.unshift(titleSlide);
          }
        } catch (err) {
          console.error(`Failed to parse content for ${versionId}:`, err);
        }
      }
      return {
        versionId: version.id,
        songTitle: version.songTitle,
        versionLabel: version.label,
        slides,
        tags: version.tags || [],
      };
    };

    const collectSlides = (program: Program | null, visited: Set<string> = new Set(), isSubprogram: boolean = false): SongSlideData[] => {
      if (!program || visited.has(program.id)) {
        return [];
      }
      visited.add(program.id);
      const result: SongSlideData[] = [];
      
      if (isSubprogram) {
        const programTitleSlide: Slide = [{ text: program.title, isHeading: true, level: 1 }];
        const programTitleData: SongSlideData = {
          versionId: `program-${program.id}`,
          songTitle: program.title,
          versionLabel: '',
          slides: [programTitleSlide],
          tags: [],
        };
        result.push(programTitleData);
      }
      
      for (const versionId of program.elementIds) {
        const songSlides = buildSongSlides(versionId);
        if (songSlides) {
          result.push(songSlides);
        }
      }
      
      for (const childId of program.programIds) {
        const childProgram = programMap[childId] || null;
        result.push(...collectSlides(childProgram, visited, true));
      }
      
      visited.delete(program.id);
      return result;
    };
    
    return collectSlides(selectedProgram, new Set());
  }, [selectedProgram, versionMap, fullVersions, programMap]);

  const processedSlides = useMemo(() => {
    return allSlides.map(songData => {
      if (songData.tags.includes('speech')) {
        return {
          ...songData,
          slides: songData.slides.slice(0, 1)
        };
      }
      return songData;
    });
  }, [allSlides]);

  const flattenedSlides = useMemo(() => {
    return processedSlides.flatMap(songData => songData.slides);
  }, [processedSlides]);

  const programTitleSlideIndices = useMemo(() => {
    const indices = new Set<number>();
    let currentIndex = 0;
    for (const songData of processedSlides) {
      if (songData.versionId.startsWith('program-')) {
        indices.add(currentIndex);
      }
      currentIndex += songData.slides.length;
    }
    return indices;
  }, [processedSlides]);

  useEffect(() => {
    if (!videoUrl || flattenedSlides.length === 0 || isExtractingFrames) return;

    const extractFramesFromVideo = async () => {
      const video = videoRef.current;
      if (!video) return;

      setIsExtractingFrames(true);
      video.src = videoUrl;

      try {
        const numFrames = Math.min(flattenedSlides.length, 100);
        const frames = await extractFrames(video, numFrames);
        setExtractedFrames(frames);
      } catch (error) {
        console.error('Error extracting frames from video:', error);
      } finally {
        setIsExtractingFrames(false);
      }
    };

    extractFramesFromVideo();
  }, [videoUrl, flattenedSlides.length, isExtractingFrames]);

  const getBackgroundForSlide = (slideIndex: number): string | undefined => {
    if (!extractedFrames || extractedFrames.length === 0) return undefined;
    if (flattenedSlides.length === 0) return undefined;
    const frameIndex = Math.floor((slideIndex / flattenedSlides.length) * extractedFrames.length);
    return extractedFrames[Math.min(frameIndex, extractedFrames.length - 1)];
  };

  useEffect(() => {
    setCurrentSlide(0);
  }, [flattenedSlides.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (flattenedSlides.length === 0) return;
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentSlide(prev => Math.min(prev + 1, flattenedSlides.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentSlide(prev => Math.max(prev - 1, 0));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flattenedSlides]);

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

  if (!selectedProgram) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Program not found</div>
      </div>
    );
  }

  if (processedSlides.length === 0 || flattenedSlides.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">No slides available</div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen flex items-center justify-center">
      <video ref={videoRef} style={{display: 'none'}} crossOrigin="anonymous" />
      {!isFullyLoaded && totalVersionsToLoad > 0 && (
        <div className="fixed top-4 left-4 z-10 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
          Loading: {loadedVersionsCount}/{totalVersionsToLoad} songs
        </div>
      )}
      {isExtractingFrames && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
          Extracting frames from video...
        </div>
      )}
      <div className={`fixed top-4 right-4 z-10 ${isFullyLoaded ? 'opacity-0 hover:opacity-100' : 'opacity-100'} hover:opacity-100`}>
        <button onClick={() => setShowUploader(!showUploader)} className="text-white text-xs bg-black bg-opacity-50 px-3 py-1 rounded">
          {showUploader ? 'Close' : 'Video Backgrounds'}
        </button>
      </div>
      <SlideItem slide={flattenedSlides[currentSlide]} className="bg-black w-screen h-screen flex items-center justify-center p-4 font-georgia" backgroundImageUrl={getBackgroundForSlide(currentSlide)} backgroundOpacity={programTitleSlideIndices.has(currentSlide) ? .75 : 0.5} isProgramTitle={programTitleSlideIndices.has(currentSlide)} />
      <div className="fixed bottom-4 right-4 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
        {currentSlide + 1} / {flattenedSlides.length}
      </div>
    </div>
  );
};

export default ProgramSlides;
