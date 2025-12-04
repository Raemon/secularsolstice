import type { Slide } from '../../src/components/slides/types';

export type Program = {
  id: string;
  title: string;
  elementIds: string[];
  programIds: string[];
  createdAt: string;
  archived: boolean;
  videoUrl?: string | null;
};

export type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
  nextVersionId: string | null;
  tags: string[];
};

export type SongSlideData = {
  versionId: string;
  songTitle: string;
  versionLabel: string;
  slides: Slide[];
  tags: string[];
};


