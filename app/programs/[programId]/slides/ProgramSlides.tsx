'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import SlideItem from '../../../../src/components/slides/SlideItem';
import { generateSlidesFromHtml, lyricsToHtml } from '../../../../src/components/slides/slideGenerators';
import { extractFrames } from '../../../../src/components/slides/slideUtils';
import type { Slide } from '../../../../src/components/slides/types';
import { extractLyrics } from '../../../../lib/lyricsExtractor';
import type { Program, VersionOption, SongSlideData } from '../../types';
import type { SongVersion } from '../../../songs/types';

type ProgramSlidesProps = {
  programId: string;
};

type SongSlideDataWithMovie = SongSlideData & { slidesMovieUrl?: string | null; slideMovieStart?: number | null; programId: string };

const ProgramSlides = ({ programId }: ProgramSlidesProps) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [fullVersions, setFullVersions] = useState<Record<string, SongVersion>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalVersionsToLoad, setTotalVersionsToLoad] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [programFrames, setProgramFrames] = useState<Record<string, string[]>>({});
  const [showUploader, setShowUploader] = useState(false);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [extractingProgramId, setExtractingProgramId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const slidesMovieRef = useRef<HTMLVideoElement>(null);
  const [backgroundMovieUrl, setBackgroundMovieUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const programVideoMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    programs.forEach((program) => {
      if (program.videoUrl !== undefined) {
        map[program.id] = program.videoUrl ?? null;
      }
    });
    if (selectedProgram?.id && videoUrl !== null && videoUrl !== undefined) {
      map[selectedProgram.id] = videoUrl;
    }
    return map;
  }, [programs, selectedProgram?.id, videoUrl]);

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

  const allSlides = useMemo<SongSlideDataWithMovie[]>(() => {
    if (!selectedProgram) return [];
    
    const linesPerSlide = 10;

    const buildSongSlides = (versionId: string, programId: string): SongSlideDataWithMovie | null => {
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
            const lyrics = extractLyrics(fullVersion.content, version.label);
            contentToProcess = lyricsToHtml(lyrics);
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
        slidesMovieUrl: fullVersion?.slidesMovieUrl,
        slideMovieStart: fullVersion?.slideMovieStart ?? null,
        programId,
      };
    };

    const collectSlides = (program: Program | null, visited: Set<string> = new Set(), isSubprogram: boolean = false): SongSlideDataWithMovie[] => {
      if (!program || visited.has(program.id)) {
        return [];
      }
      visited.add(program.id);
      const result: SongSlideDataWithMovie[] = [];
      
      if (isSubprogram) {
        const programTitleSlide: Slide = [{ text: program.title, isHeading: true, level: 1 }];
        const programTitleData: SongSlideDataWithMovie = {
          versionId: `program-${program.id}`,
          songTitle: program.title,
          versionLabel: '',
          slides: [programTitleSlide],
          tags: [],
          programId: program.id,
        };
        result.push(programTitleData);
      }
      
      for (const versionId of program.elementIds) {
        const songSlides = buildSongSlides(versionId, program.id);
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
    const slides: Slide[] = [];
    for (const songData of processedSlides) {
      slides.push(...songData.slides);
      slides.push([]);
    }
    return slides;
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

  const slideToSongIndex = useMemo(() => {
    const indices: number[] = [];
    processedSlides.forEach((songData, songIndex) => {
      songData.slides.forEach(() => indices.push(songIndex));
      indices.push(songIndex);
    });
    return indices;
  }, [processedSlides]);

  const slideToProgramId = useMemo(() => {
    const ids: string[] = [];
    processedSlides.forEach((songData) => {
      songData.slides.forEach(() => ids.push(songData.programId));
      ids.push(songData.programId);
    });
    return ids;
  }, [processedSlides]);

  const programSlideCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    slideToProgramId.forEach((programId) => {
      if (!programId) return;
      counts[programId] = (counts[programId] || 0) + 1;
    });
    return counts;
  }, [slideToProgramId]);

  const slidePositionInProgram = useMemo(() => {
    const counters: Record<string, number> = {};
    return slideToProgramId.map((programId) => {
      if (!programId) {
        return 0;
      }
      counters[programId] = (counters[programId] || 0) + 1;
      return counters[programId] - 1;
    });
  }, [slideToProgramId]);

  const programIdsInSlides = useMemo(() => {
    const ids = new Set<string>();
    processedSlides.forEach((songData) => {
      ids.add(songData.programId);
    });
    return Array.from(ids);
  }, [processedSlides]);

  const songSlideRanges = useMemo(() => {
    const ranges: { start: number; length: number }[] = [];
    let currentIndex = 0;
    processedSlides.forEach((songData) => {
      ranges.push({ start: currentIndex, length: songData.slides.length });
      currentIndex += songData.slides.length + 1;
    });
    return ranges;
  }, [processedSlides]);

  useEffect(() => {
    if (flattenedSlides.length === 0 || isExtractingFrames) return;
    const video = videoRef.current;
    if (!video) return;

    const nextProgramId = programIdsInSlides.find((programId) => {
      const videoForProgram = programVideoMap[programId];
      return videoForProgram && !programFrames[programId];
    });

    if (!nextProgramId) return;
    const videoForProgram = programVideoMap[nextProgramId];
    if (!videoForProgram) return;

    const extractFramesFromVideo = async () => {
      setIsExtractingFrames(true);
      setExtractingProgramId(nextProgramId);
      video.src = videoForProgram;

      try {
        const slideCount = programSlideCounts[nextProgramId] || flattenedSlides.length;
        const numFrames = Math.min(Math.max(slideCount, 1), 100);
        const frames = await extractFrames(video, numFrames);
        setProgramFrames(prev => ({ ...prev, [nextProgramId]: frames }));
      } catch (error) {
        console.error(`Error extracting frames from video for program ${nextProgramId}:`, error);
      } finally {
        setIsExtractingFrames(false);
        setExtractingProgramId(null);
      }
    };

    extractFramesFromVideo();
  }, [programIdsInSlides, programVideoMap, programFrames, flattenedSlides.length, isExtractingFrames, programSlideCounts]);

  const getBackgroundForSlide = (slideIndex: number): string | undefined => {
    const programIdForSlide = slideToProgramId[slideIndex] || selectedProgram?.id || null;
    const framesForProgram = programIdForSlide ? programFrames[programIdForSlide] : undefined;
    const fallbackProgramId = selectedProgram?.id && programIdForSlide !== selectedProgram.id ? selectedProgram.id : null;
    const fallbackFrames = fallbackProgramId ? programFrames[fallbackProgramId] : undefined;
    const chosenFrames = framesForProgram && framesForProgram.length > 0 ? framesForProgram : fallbackFrames;
    if (!chosenFrames || chosenFrames.length === 0) return undefined;
    const slideCount = framesForProgram && framesForProgram.length > 0 ? programSlideCounts[programIdForSlide as string] || flattenedSlides.length : flattenedSlides.length;
    const positionInProgram = framesForProgram && framesForProgram.length > 0 ? slidePositionInProgram[slideIndex] ?? slideIndex : slideIndex;
    const frameIndex = Math.floor((positionInProgram / Math.max(slideCount, 1)) * chosenFrames.length);
    return chosenFrames[Math.min(frameIndex, chosenFrames.length - 1)];
  };

  useEffect(() => {
    setCurrentSlide(0);
  }, [flattenedSlides.length]);

  useEffect(() => {
    setBackgroundMovieUrl(null);
  }, [selectedProgram?.id]);

  useEffect(() => {
    if (slideToSongIndex.length === 0) return;
    const songIndex = slideToSongIndex[Math.min(currentSlide, slideToSongIndex.length - 1)];
    const songData = typeof songIndex === 'number' ? processedSlides[songIndex] : undefined;
    const range = typeof songIndex === 'number' ? songSlideRanges[songIndex] : undefined;
    if (songData?.slidesMovieUrl && range) {
      const withinSongSlides = currentSlide >= range.start && currentSlide < range.start + range.length;
      if (withinSongSlides) {
        const positionInSong = currentSlide - range.start + 1;
        const startAt = songData.slideMovieStart ?? 1;
        if (positionInSong >= startAt) {
          if (backgroundMovieUrl !== songData.slidesMovieUrl) {
            setBackgroundMovieUrl(songData.slidesMovieUrl);
          }
        }
      }
    }
  }, [currentSlide, slideToSongIndex, processedSlides, songSlideRanges, backgroundMovieUrl]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

  const backgroundImageUrl = backgroundMovieUrl ? undefined : getBackgroundForSlide(currentSlide);
  const overlayOpacity = programTitleSlideIndices.has(currentSlide) ? .75 : 0.5;
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
    <div ref={containerRef} className="relative w-screen h-screen flex items-center justify-center">
      <style>
        {`
          .slideMeta {
            opacity: 0.65;
            font-style: italic;
            color: white;
          }
        `}
      </style>
      <video ref={videoRef} style={{display: 'none'}} crossOrigin="anonymous" />
      {backgroundMovieUrl && (
        <video ref={slidesMovieRef} className="absolute inset-0 w-full h-full object-cover" muted loop playsInline autoPlay preload="auto" style={{zIndex: 0}} />
      )}
      {backgroundMovieUrl && (
        <div className="absolute inset-0 bg-black" style={{opacity: overlayOpacity, zIndex: 1}} />
      )}
      {!isFullyLoaded && totalVersionsToLoad > 0 && (
        <div className="fixed top-4 left-4 z-10 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
          Loading: {loadedVersionsCount}/{totalVersionsToLoad} songs
        </div>
      )}
      {isExtractingFrames && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
          Extracting frames from video{extractingProgramId && programMap[extractingProgramId]?.title ? ` (${programMap[extractingProgramId].title})` : ''}...
        </div>
      )}
      <div className={`fixed top-4 right-4 z-10 ${isFullyLoaded ? 'opacity-0 hover:opacity-100' : 'opacity-100'} hover:opacity-100 space-x-2`}>
        <button onClick={() => setShowUploader(!showUploader)} className="text-white text-xs bg-black bg-opacity-50 px-3 py-1 rounded">
          {showUploader ? 'Close' : 'Video Backgrounds'}
        </button>
        <button onClick={toggleFullscreen} className="text-white text-xs bg-black bg-opacity-50 px-3 py-1 rounded">
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>
      <SlideItem slide={flattenedSlides[currentSlide]} className={backgroundMovieUrl ? "w-screen h-screen flex items-center justify-center p-4 font-georgia bg-transparent" : "bg-black w-screen h-screen flex items-center justify-center p-4 font-georgia"} backgroundImageUrl={backgroundImageUrl} backgroundOpacity={programTitleSlideIndices.has(currentSlide) ? .75 : 0.5} isProgramTitle={programTitleSlideIndices.has(currentSlide)} hasMovie={!!backgroundMovieUrl} />
      <div className="fixed bottom-4 right-4 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
        {currentSlide + 1} / {flattenedSlides.length}
      </div>
    </div>
  );
};

export default ProgramSlides;
