export interface ParsedLine {
  text?: string;
  isImage?: boolean;
  src?: string;
  isSvg?: boolean;
  isHeading?: boolean;
  level?: number;
  isHr?: boolean;
  isEmpty?: boolean;
}

export type Slide = ParsedLine[];

export type StatusType = 'info' | 'success' | 'error' | null;

