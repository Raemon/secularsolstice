export type SongVersion = {
  id: string;
  songId: string;
  label: string;
  content: string | null;
  audioUrl: string | null;
  previousVersionId: string | null;
  nextVersionId: string | null;
  originalVersionId: string | null;
  renderedContent: string | null;
  bpm: number | null;
  createdAt: string;
};

export type Song = {
  id: string;
  title: string;
  createdAt: string;
  versions: SongVersion[];
};

