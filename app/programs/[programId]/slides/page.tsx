'use client';

import { useEffect, useMemo, useState } from 'react';
import SlideItem from '../../../../src/components/slides/SlideItem';
import { generateSlidesFromHtml } from '../../../../src/components/slides/slideGenerators';
import type { Slide } from '../../../../src/components/slides/types';
import { extractLyrics } from '../../../../lib/lyricsExtractor';
import type { Program, VersionOption, SongSlideData } from '../../types';
import type { SongVersion } from '../../../songs/types';

type ProgramSlidesPageProps = {
  params: Promise<{
    programId: string;
  }>;
};

const ProgramSlidesPage = ({ params }: ProgramSlidesPageProps) => {
  const [programId, setProgramId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [fullVersions, setFullVersions] = useState<Record<string, SongVersion>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    params.then(({ programId }) => {
      setProgramId(programId);
    });
  }, [params]);

  useEffect(() => {
    const loadData = async () => {
      if (!programId) return;
      
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

    const versionIdSet = new Set<string>(collectVersionIds(selectedProgram));
    
    versionIdSet.forEach((versionId) => {
      fetch(`/api/songs/versions/${versionId}`)
        .then((response) => {
          if (!response.ok) {
            return null;
          }
          return response.json();
        })
        .then((data) => {
          if (!data || !data.version) {
            return;
          }
          setFullVersions((prev) => ({ ...prev, [versionId]: data.version }));
        })
        .catch((err) => {
          console.error(`Failed to fetch version ${versionId}:`, err);
        });
    });
  }, [selectedProgram, programMap]);

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
      <SlideItem slide={flattenedSlides[currentSlide]} className="bg-black w-screen h-screen flex items-center justify-center p-4 font-georgia" />
      <div className="fixed bottom-4 right-4 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
        {currentSlide + 1} / {flattenedSlides.length}
      </div>
    </div>
  );
};

export default ProgramSlidesPage;

