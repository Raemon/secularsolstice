import type { Slide } from '../../src/components/slides/types';

export type Program = {
  id: string;
  title: string;
  elementIds: string[];
  programIds: string[];
  createdAt: string;
  archived: boolean;
  isSubprogram: boolean;
  videoUrl?: string | null;
  printProgramForeword?: string | null;
  printProgramEpitaph?: string | null;
};

export type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
  nextVersionId: string | null;
  programCredits: string | null;
  tags: string[];
  slideMovieStart?: number | null;
};

export type SongSlideData = {
  versionId: string;
  songTitle: string;
  versionLabel: string;
  slides: Slide[];
  tags: string[];
  slidesMovieUrl?: string | null;
  slideMovieStart?: number | null;
};


