import type { Song } from '../songs/types';
import { ParsedLine, StatusType } from '../../src/components/slides/types';

export type Section = {
  title: string;
  content: string;
  lines: ParsedLine[];
};

export type ProcessResult = {
  title: string;
  matched: boolean;
  songId?: string;
  error?: string;
};

export type CandidateSong = {
  song: Song;
  similarity: number;
};

export type PreviewItem = {
  itemKey: string; // unique key: `${sectionTitle}::${songId}` or `${sectionTitle}::new`
  sectionTitle: string;
  candidateSong: CandidateSong | null; // null means "create new song"
  selectedVersionId: string | null;
  dontImport: boolean;
  versionName: string;
  content: string;
  contentPreview: string;
};

export type { Song, ParsedLine, StatusType };
