// Supported file extensions by category
export const SUPPORTED_EXTENSIONS: Record<string, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
  video: ['mp4', 'webm', 'mov', 'avi', 'mkv'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'aiff', 'aif', 'wma', 'webm'],
  pdf: ['pdf'],
  musicxml: ['musicxml', 'xml', 'mxl', 'mxml'],
  musescore: ['mscz', 'mscx'],
  text: ['txt', 'md', 'json', 'csv'],
  midi: ['midi', 'mid'],
};

export const ALL_SUPPORTED_EXTENSIONS = Object.values(SUPPORTED_EXTENSIONS).flat();

export const BLOB_UPLOAD_ACCEPT = ALL_SUPPORTED_EXTENSIONS.map(ext => `.${ext}`).join(',');

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
  slideMovieStart: number | null;
  previousVersionId: string | null;
  nextVersionId: string | null;
  originalVersionId: string | null;
  renderedContent: RenderedContent | null;
  bpm: number | null;
  transpose: number | null;
  archived: boolean;
  createdAt: string;
  dbCreatedAt: string;
  createdBy: string | null;
  slideCredits: string | null;
  programCredits: string | null;
  blobUrl: string | null;
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

export const createFallbackSongVersion = (partial: Pick<SongVersion, 'id' | 'songId' | 'label' | 'createdAt'> & Partial<Pick<SongVersion, 'nextVersionId' | 'dbCreatedAt'>>): SongVersion => ({
  id: partial.id,
  songId: partial.songId,
  label: partial.label,
  createdAt: partial.createdAt,
  dbCreatedAt: partial.dbCreatedAt ?? partial.createdAt,
  content: '',
  audioUrl: '',
  slidesMovieUrl: null,
  slideMovieStart: null,
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
  blobUrl: null,
});
