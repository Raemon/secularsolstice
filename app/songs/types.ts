export type RenderedContent = {
  htmlFull?: string;
  htmlChordsOnly?: string;
  htmlLyricsOnly?: string;
  htmlChordsFirstLyricLine?: string;
  plainText?: string;
  slides?: string;
  legacy?: string;
  [key: string]: string | undefined;
};

export type SongVersion = {
  id: string;
  songId: string;
  label: string;
  content: string | null;
  audioUrl: string | null;
  slidesMovieUrl: string | null;
  previousVersionId: string | null;
  nextVersionId: string | null;
  originalVersionId: string | null;
  renderedContent: RenderedContent | null;
  bpm: number | null;
  transpose: number | null;
  archived: boolean;
  createdAt: string;
  createdBy: string | null;
  slideCredits: string | null;
  programCredits: string | null;
};

export type Song = {
  id: string;
  title: string;
  createdAt: string;
  archived: boolean;
  versions: SongVersion[];
  createdBy: string | null;
  tags: string[];
};

export const createFallbackSongVersion = (partial: Pick<SongVersion, 'id' | 'songId' | 'label' | 'createdAt'> & Partial<Pick<SongVersion, 'nextVersionId'>>): SongVersion => ({
  id: partial.id,
  songId: partial.songId,
  label: partial.label,
  createdAt: partial.createdAt,
  content: '',
  audioUrl: '',
  previousVersionId: null,
  nextVersionId: partial.nextVersionId ?? null,
  originalVersionId: null,
  renderedContent: null,
  bpm: null,
  transpose: null,
  archived: false,
  slideCredits: null,
  programCredits: null,
  createdBy: null,
});

