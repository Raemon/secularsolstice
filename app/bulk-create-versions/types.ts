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

export type PreviewItem = {
  sectionTitle: string;
  song: Song | null;
  versionName: string;
  contentPreview: string;
};

export type { Song, ParsedLine, StatusType };








