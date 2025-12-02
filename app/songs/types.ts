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
  previousVersionId: string | null;
  nextVersionId: string | null;
  originalVersionId: string | null;
  renderedContent: RenderedContent | null;
  bpm: number | null;
  transpose: number | null;
  archived: boolean;
  createdAt: string;
  createdBy: string | null;
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

