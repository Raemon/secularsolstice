import path from 'path';
import { promises as fs } from 'fs';
import { put } from '@vercel/blob';
import { createSong, createVersionWithLineage, findVersionBySongTitleAndLabel, getLatestVersionBySongTitle, getLatestVersionIdForSong, addSongTags } from './songsRepository';
import { createProgram, getProgramByTitle, updateProgramElementIds } from './programsRepository';
import { processVersionLilypondIfNeeded } from './lilypondRenderer';
import sql from './db';
import { AUDIO_EXTENSION_SET } from './audioExtensions';
import { runWithLimit } from './asyncUtils';
export { runWithLimit };

const IMPORT_USER = 'secularsolstice-import';

const getMimeType = (ext: string): string => {
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf', '.mid': 'audio/midi', '.midi': 'audio/midi',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.xml': 'application/xml', '.musicxml': 'application/vnd.recordare.musicxml+xml',
    '.mxl': 'application/vnd.recordare.musicxml', '.mscz': 'application/x-musescore',
    '.html': 'text/html', '.txt': 'text/plain', '.md': 'text/markdown',
    '.ly': 'text/x-lilypond', '.csv': 'text/csv', '.cho': 'text/plain', '.ugc': 'text/plain',
  };
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
};

const isValidTextContent = (buffer: Buffer): boolean => {
  if (buffer.includes(0)) return false;
  const text = buffer.toString('utf-8');
  if (text.includes('\uFFFD')) return false;
  return true;
};

const uploadToBlob = async (buffer: Buffer, songId: string, fileName: string): Promise<string> => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('Blob storage token not configured (BLOB_READ_WRITE_TOKEN)');
  const ext = path.extname(fileName).toLowerCase();
  const contentType = getMimeType(ext);
  const safeName = fileName.replace(/\//g, '-');
  const blob = await put(`song-${songId}/import-${Date.now()}-${safeName}`, buffer, { access: 'public', contentType, token });
  return blob.url;
};

const normalizeTitle = (name: string) => name.replace(/_/g, ' ').trim();

// Strip markdown formatting from a line (headers, bold, italic, etc.)
// Using custom stripping rather than marked library since we only need plain text from a single line
const stripMarkdownFormatting = (line: string): string => {
  return line
    .replace(/^#+\s*/, '') // Remove markdown headers (#, ##, ###, etc.)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Extract text from links [text](url) -> text
    .replace(/\*\*/g, '') // Remove bold (**)
    .replace(/\*/g, '') // Remove italic/emphasis (*)
    .replace(/__/g, '') // Remove bold (__)
    .replace(/_/g, '') // Remove italic/emphasis (_)
    .replace(/`/g, '') // Remove code backticks
    .trim();
};

// Process README.md content: remove first line if it matches the song title
// Also convert "By " headers to italics
const processReadmeContent = (content: string, songTitle: string): string => {
  if (!content) return content;
  const lines = content.split('\n');
  const firstLine = lines[0];
  const strippedFirstLine = stripMarkdownFormatting(firstLine);
  const normalizedSongTitle = normalizeTitle(songTitle);
  // strippedFirstLine is already trimmed; normalizedSongTitle handles underscore→space
  let startIdx = 0;
  if (strippedFirstLine.toLowerCase() === normalizedSongTitle.toLowerCase()) {
    startIdx = 1;
    while (startIdx < lines.length && lines[startIdx].trim() === '') {
      startIdx++;
    }
  }
  // Check if the new first line is a header starting with "By "
  if (startIdx < lines.length) {
    const newFirstLine = lines[startIdx];
    const headerMatch = newFirstLine.match(/^#+\s*/);
    if (headerMatch) {
      const headerContent = newFirstLine.slice(headerMatch[0].length);
      if (headerContent.startsWith('By ')) {
        lines[startIdx] = `*${headerContent}*`;
      }
    }
  }
  return lines.slice(startIdx).join('\n');
};

// Get text content from a file buffer, applying title stripping for .md files if applicable
const getProcessedTextContent = (buffer: Buffer, relativePath: string, songTitle: string): string => {
  let content = buffer.toString('utf-8');
  if (path.extname(relativePath).toLowerCase() === '.md') {
    content = processReadmeContent(content, songTitle);
  }
  return content;
};

const getSongByTitle = async (title: string, includeArchived = false) => {
  const rows = await sql`select id, tags from songs where LOWER(title) = LOWER(${title}) ${includeArchived ? sql`` : sql`and archived = false`} limit 1`;
  return rows.length > 0 ? rows[0] as { id: string; tags: string[] | null } : null;
};

const ensureSong = async (title: string, tags: string[]) => {
  const existing = await getSongByTitle(title);
  if (existing) return existing.id;
  try {
    const created = await createSong(title, IMPORT_USER, tags);
    return created.id;
  } catch (error) {
    if ((error as any)?.code === '23505') {
      const duplicate = await getSongByTitle(title, true);
      if (duplicate) return duplicate.id;
    }
    throw error;
  }
};

// Default: use file mtime (works for local files, but not for git repos downloaded as ZIP)
const getFileCreatedAtDefault = async (filePath: string) => {
  const stats = await fs.stat(filePath);
  return stats.mtime.toISOString();
};

// Module-level override for git-based timestamp lookup
let getFileCreatedAtOverride: ((filePath: string) => Promise<string | null>) | null = null;

export const setFileCreatedAtFn = (fn: ((filePath: string) => Promise<string | null>) | null) => {
  getFileCreatedAtOverride = fn;
};

const getFileCreatedAt = async (filePath: string): Promise<string> => {
  if (getFileCreatedAtOverride) {
    const result = await getFileCreatedAtOverride(filePath);
    if (result) return result;
  }
  return getFileCreatedAtDefault(filePath);
};

const timestampsMatch = (existing: string, candidate: string) => new Date(existing).toISOString() === new Date(candidate).toISOString();

const findExistingVersion = async (songTitle: string, labels: string[], createdAt: string) => {
  let firstExisting: Awaited<ReturnType<typeof findVersionBySongTitleAndLabel>> = null;
  for (const label of labels) {
    const existing = await findVersionBySongTitleAndLabel(songTitle, label);
    if (!existing) continue;
    if (!firstExisting) firstExisting = existing;
    const matches = existing.createdAt ? timestampsMatch(existing.createdAt, createdAt) : false;
    if (matches) return { existing, matches };
  }
  return firstExisting ? { existing: firstExisting, matches: false } : null;
};

type FileInfo = { fullPath: string; relativePath: string; buffer: Buffer; isText: boolean };

const SKIP_FILES = new Set(['makefile', '.ds_store', 'index.html', 'thumb.png']);
const SKIP_DIRS = new Set(['node_modules', '.git']);

const collectFiles = async (dirPath: string, baseDir: string): Promise<FileInfo[]> => {
  const files: FileInfo[] = [];
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    console.warn(`Failed to read directory ${dirPath}:`, err);
    return files;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...await collectFiles(fullPath, baseDir));
      continue;
    }

    if (SKIP_FILES.has(entry.name.toLowerCase())) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (AUDIO_EXTENSION_SET.has(ext)) continue; // Skip audio files (handle separately)

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(fullPath);
    } catch (err) {
      console.warn(`Failed to read file ${fullPath}:`, err);
      continue;
    }
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    // .mscx files are always blobs; files > 100KB are blobs even if valid text
    const isText = ext !== '.mscx' && isValidTextContent(buffer) && buffer.length <= 100 * 1024;
    files.push({ fullPath, relativePath, buffer, isText });
  }
  return files;
};

export type ImportResult = { title: string; label: string; status: string; url?: string; error?: string };

const versionUrl = (songId: string | null | undefined, versionId: string | null | undefined) => songId && versionId ? `/songs/${songId}/${versionId}` : undefined;

export const importSongDirectory = async (
  songDirPath: string,
  dirName: string,
  tags: string[],
  dryRun: boolean,
  onResult?: (result: ImportResult) => void
): Promise<ImportResult[]> => {
  const results: ImportResult[] = [];
  const songTitle = normalizeTitle(dirName);

  let songId: string | null = null;
  try {
    if (dryRun) {
      const existingSong = await getSongByTitle(songTitle);
      songId = existingSong ? existingSong.id : null;
    } else {
      songId = await ensureSong(songTitle, tags);
    }
  } catch (error) {
    const result = { title: songTitle, label: '', status: 'failed', error: error instanceof Error ? error.message : 'unknown error' };
    results.push(result);
    onResult?.(result);
    return results;
  }

  let files: FileInfo[];
  try {
    files = await collectFiles(songDirPath, songDirPath);
  } catch (error) {
    const result = { title: songTitle, label: '', status: 'failed', error: `Failed to collect files: ${error instanceof Error ? error.message : 'unknown error'}` };
    results.push(result);
    onResult?.(result);
    return results;
  }
  if (files.length === 0) return results;

  for (const file of files) {
    // Strip "gen/" prefix if present
    const sourceLabel = file.relativePath.replace(/^gen\//, '');
    const label = normalizeTitle(sourceLabel);
    let createdAt: string;
    let existingVersion: Awaited<ReturnType<typeof findExistingVersion>> | null = null;
    try {
      createdAt = await getFileCreatedAt(file.fullPath);
      existingVersion = await findExistingVersion(songTitle, [label, sourceLabel], createdAt);
    } catch (error) {
      const result = { title: songTitle, label, status: 'failed', error: `Failed to check existing version: ${error instanceof Error ? error.message : 'unknown error'}` };
      results.push(result);
      onResult?.(result);
      continue;
    }

    // If timestamps match exactly, the file hasn't changed since import
    if (existingVersion?.matches) {
      const url = versionUrl(existingVersion.existing?.songId, existingVersion.existing?.id);
      const result = { title: songTitle, label, status: 'exists', url };
      results.push(result);
      onResult?.(result);
      continue;
    }

    // If version exists but timestamps don't match, compare content
    if (existingVersion?.existing) {
      const existingContent = existingVersion.existing.content;
      const newContent = file.isText ? getProcessedTextContent(file.buffer, file.relativePath, songTitle) : null;
      // For text files, compare content; for binary, compare by blob existence
      const contentMatches = file.isText
        ? existingContent === newContent
        : Boolean(existingVersion.existing.blobUrl); // Binary exists = assume unchanged
      if (contentMatches) {
        const url = versionUrl(existingVersion.existing.songId, existingVersion.existing.id);
        const result = { title: songTitle, label, status: 'exists', url };
        results.push(result);
        onResult?.(result);
        continue;
      }
      // Content differs - would update (create new version in lineage)
      if (dryRun) {
        const url = versionUrl(existingVersion.existing.songId, existingVersion.existing.id);
        const result = { title: songTitle, label, status: 'would-update', url };
        results.push(result);
        onResult?.(result);
        continue;
      }
    }

    try {
      if (dryRun) {
        const statusType = file.isText ? 'would-create' : 'would-create-binary';
        const result = { title: songTitle, label, status: statusType };
        results.push(result);
        onResult?.(result);
      } else {
        let previousVersionId: string | null = null;
        try {
          previousVersionId = await getLatestVersionIdForSong(songId!);
        } catch (error) {
          const result = { title: songTitle, label, status: 'failed', error: `Failed to get latest version: ${error instanceof Error ? error.message : 'unknown error'}` };
          results.push(result);
          onResult?.(result);
          continue;
        }
        if (file.isText) {
          try {
            const content = getProcessedTextContent(file.buffer, file.relativePath, songTitle);
            const created = await createVersionWithLineage({
              songId: songId!, label, content, previousVersionId, createdBy: IMPORT_USER, createdAt, dbCreatedAt: new Date(),
            });
            // Process lilypond in background
            processVersionLilypondIfNeeded(created.id).catch(err => console.error('[importUtils] Background lilypond processing failed:', err));
            const url = versionUrl(created.songId, created.id);
            const result = { title: songTitle, label, status: 'created', url };
            results.push(result);
            onResult?.(result);
          } catch (error) {
            const result = { title: songTitle, label, status: 'failed', error: `Failed to create version: ${error instanceof Error ? error.message : 'unknown error'}` };
            results.push(result);
            onResult?.(result);
          }
        } else {
          try {
            const blobUrl = await uploadToBlob(file.buffer, songId!, sourceLabel);
            const created = await createVersionWithLineage({
              songId: songId!, label, content: null, blobUrl, previousVersionId, createdBy: IMPORT_USER, createdAt, dbCreatedAt: new Date(),
            });
            // Process lilypond in background (blob could be .ly file)
            processVersionLilypondIfNeeded(created.id).catch(err => console.error('[importUtils] Background lilypond processing failed:', err));
            const url = versionUrl(created.songId, created.id);
            const result = { title: songTitle, label, status: 'created-binary', url };
            results.push(result);
            onResult?.(result);
          } catch (error) {
            const result = { title: songTitle, label, status: 'failed', error: `Failed to create binary version: ${error instanceof Error ? error.message : 'unknown error'}` };
            results.push(result);
            onResult?.(result);
          }
        }
      }
    } catch (error) {
      const result = { title: songTitle, label, status: 'failed', error: error instanceof Error ? error.message : 'unknown error' };
      results.push(result);
      onResult?.(result);
    }
  }
  return results;
};

// Generic text file import for speeches, activities, etc.
const importTextFile = async (
  filePath: string,
  fileName: string,
  tag: string,
  dryRun: boolean,
  onResult?: (result: ImportResult) => void
): Promise<ImportResult | null> => {
  const ext = path.extname(fileName).toLowerCase();
  if (AUDIO_EXTENSION_SET.has(ext)) return null;

  let buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch (err) {
    console.warn(`Failed to read ${tag} file ${filePath}:`, err);
    return null;
  }

  if (!isValidTextContent(buffer)) return null;

  const title = normalizeTitle(path.basename(fileName, ext || undefined));
  const sourceLabel = fileName;
  const label = normalizeTitle(sourceLabel);
  const content = buffer.toString('utf-8').trim();
  if (!content) return null;

  let songId: string | null = null;
  try {
    if (dryRun) {
      const existingSong = await getSongByTitle(title);
      songId = existingSong ? existingSong.id : null;
    } else {
      songId = await ensureSong(title, [tag]);
    }
  } catch (error) {
    const result = { title, label, status: 'failed', error: `Failed to ensure song: ${error instanceof Error ? error.message : 'unknown error'}` };
    onResult?.(result);
    return result;
  }

  let createdAt: string;
  let existingVersion: Awaited<ReturnType<typeof findExistingVersion>> | null = null;
  try {
    createdAt = await getFileCreatedAt(filePath);
    existingVersion = await findExistingVersion(title, [label, sourceLabel], createdAt);
  } catch (error) {
    const result = { title, label, status: 'failed', error: `Failed to check existing version: ${error instanceof Error ? error.message : 'unknown error'}` };
    onResult?.(result);
    return result;
  }

  // If timestamps match exactly, the file hasn't changed since import
  if (existingVersion?.matches) {
    const url = versionUrl(existingVersion.existing?.songId, existingVersion.existing?.id);
    const result = { title, label, status: 'exists', url };
    onResult?.(result);
    return result;
  }

  // If version exists but timestamps don't match, compare content
  if (existingVersion?.existing) {
    const existingContent = existingVersion.existing.content;
    if (existingContent === content) {
      const url = versionUrl(existingVersion.existing.songId, existingVersion.existing.id);
      const result = { title, label, status: 'exists', url };
      onResult?.(result);
      return result;
    }
    // Content differs - would update
    if (dryRun) {
      const url = versionUrl(existingVersion.existing.songId, existingVersion.existing.id);
      const result = { title, label, status: 'would-update', url };
      onResult?.(result);
      return result;
    }
  }

  try {
    if (dryRun) {
      const result = { title, label, status: 'would-create' };
      onResult?.(result);
      return result;
    } else {
      let previousVersionId: string | null = null;
      try {
        previousVersionId = await getLatestVersionIdForSong(songId!);
      } catch (error) {
        const result = { title, label, status: 'failed', error: `Failed to get latest version: ${error instanceof Error ? error.message : 'unknown error'}` };
        onResult?.(result);
        return result;
      }
      try {
        const created = await createVersionWithLineage({
          songId: songId!, label, content, previousVersionId, createdBy: IMPORT_USER, createdAt, dbCreatedAt: new Date(),
        });
        // Process lilypond in background
        processVersionLilypondIfNeeded(created.id).catch(err => console.error('[importUtils] Background lilypond processing failed:', err));
        const url = versionUrl(created.songId, created.id);
        const result = { title, label, status: 'created', url };
        onResult?.(result);
        return result;
      } catch (error) {
        const result = { title, label, status: 'failed', error: `Failed to create version: ${error instanceof Error ? error.message : 'unknown error'}` };
        onResult?.(result);
        return result;
      }
    }
  } catch (error) {
    const result = { title, label, status: 'failed', error: error instanceof Error ? error.message : 'unknown error' };
    onResult?.(result);
    return result;
  }
};

export const importSpeechFile = (filePath: string, fileName: string, dryRun: boolean, onResult?: (result: ImportResult) => void) =>
  importTextFile(filePath, fileName, 'speech', dryRun, onResult);

// Parse All_Activities.list to get list of activity names
const parseActivitiesList = (content: string): string[] => {
  const activities: string[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue; // Skip empty lines and section headers
    activities.push(trimmed);
  }
  return activities;
};

// Import activities by reading the All_Activities.list file and importing those specific speeches as activities
export const importActivitiesFromList = async (
  activitiesListFile: string,
  speechesDir: string,
  dryRun: boolean,
  onResult?: (result: ImportResult) => void
): Promise<ImportResult[]> => {
  const results: ImportResult[] = [];

  let listContent: string;
  try {
    listContent = (await fs.readFile(activitiesListFile)).toString('utf-8');
  } catch (err) {
    console.warn(`Failed to read activities list file ${activitiesListFile}:`, err);
    return results;
  }

  const activityNames = parseActivitiesList(listContent);

  for (const activityName of activityNames) {
    // Try to find the file in speeches directory (could be .md or other extension)
    const possibleExtensions = ['.md', '.txt', '.html', ''];
    let foundFile: string | null = null;

    for (const ext of possibleExtensions) {
      const filePath = path.join(speechesDir, activityName + ext);
      try {
        await fs.access(filePath);
        foundFile = filePath;
        break;
      } catch {
        continue;
      }
    }

    if (!foundFile) {
      // Try without extension matching (exact filename)
      try {
        const entries = await fs.readdir(speechesDir, { withFileTypes: true });
        const match = entries.find(e => e.isFile() && e.name.startsWith(activityName));
        if (match) {
          foundFile = path.join(speechesDir, match.name);
        }
      } catch {
        // Ignore
      }
    }

    if (!foundFile) {
      const result = { title: normalizeTitle(activityName), label: activityName, status: 'failed', error: 'File not found in speeches directory' };
      results.push(result);
      onResult?.(result);
      continue;
    }

    const fileName = path.basename(foundFile);
    try {
      const result = await importTextFile(foundFile, fileName, 'activity', dryRun, onResult);
      if (result) results.push(result);
    } catch (error) {
      const result = { title: normalizeTitle(activityName), label: activityName, status: 'failed', error: error instanceof Error ? error.message : 'unknown error' };
      results.push(result);
      onResult?.(result);
    }
  }

  return results;
};

export type ProgramImportResult = { title: string; status: string; url?: string; error?: string; elementCount?: number; missingElements?: string[]; createdPlaceholders?: string[] };

type ParsedProgramItem = { type: 'song' | 'section'; name: string };

// Find or create a song with an empty version for a given title
const findOrCreateEmptyVersion = async (title: string, dryRun: boolean, tags: string[]): Promise<string | null> => {
  try {
    // First try to find existing
    const existing = await getLatestVersionBySongTitle(title);
    if (existing) {
      // Add tags to existing song if we have any
      if (tags.length > 0 && !dryRun) {
        try {
          await addSongTags(existing.songId, tags);
        } catch (error) {
          console.warn(`Failed to add tags to song ${existing.songId}:`, error);
        }
      }
      return existing.id;
    }

    if (dryRun) return null;

    // Create song with empty version
    let songId: string;
    try {
      songId = await ensureSong(title, tags);
    } catch (error) {
      console.warn(`Failed to ensure song ${title}:`, error);
      return null;
    }
    // Also add tags in case ensureSong found existing song without versions
    if (tags.length > 0) {
      try {
        await addSongTags(songId, tags);
      } catch (error) {
        console.warn(`Failed to add tags to song ${songId}:`, error);
      }
    }
    try {
      const created = await createVersionWithLineage({
        songId,
        label: 'README.md',
        content: `${title}\n\n(Imported from secularsolstice.github.io, empty version placeholder)`,
        previousVersionId: null,
        createdBy: IMPORT_USER,
        dbCreatedAt: new Date(),
      });
      return created.id;
    } catch (error) {
      console.warn(`Failed to create empty version for song ${songId}:`, error);
      return null;
    }
  } catch (error) {
    console.warn(`Failed to find or create empty version for ${title}:`, error);
    return null;
  }
};

type ResolvedProgramItems = {
  elementIds: string[];
  programIds: string[];
  missingElements: string[];
  createdPlaceholders: string[];
};

// Shared logic for resolving parsed program items into element/program IDs
// reuseSubprograms: if true, look for existing subprograms before creating new ones (used by resync)
const resolveProgramItems = async (
  items: ParsedProgramItem[],
  dryRun: boolean,
  reuseSubprograms: boolean
): Promise<ResolvedProgramItems> => {
  const elementIds: string[] = [];
  const programIds: string[] = [];
  const missingElements: string[] = [];
  const createdPlaceholders: string[] = [];
  let currentSectionItems: string[] = [];
  let currentSectionName: string | null = null;
  let currentSectionNumber = 0;

  const flushSection = async () => {
    if (currentSectionName && currentSectionItems.length > 0) {
      try {
        if (reuseSubprograms) {
          // Check for existing subprogram first
          try {
            const existingSubProgram = await getProgramByTitle(currentSectionName);
            if (existingSubProgram) {
              if (!dryRun) {
                try {
                  await updateProgramElementIds(existingSubProgram.id, currentSectionItems, [], IMPORT_USER);
                } catch (error) {
                  console.warn(`Failed to update subprogram ${existingSubProgram.id}:`, error);
                }
              }
              programIds.push(existingSubProgram.id);
            } else if (!dryRun) {
              try {
                const subProgram = await createProgram(currentSectionName, IMPORT_USER, true, true, undefined, new Date());
                try {
                  await updateProgramElementIds(subProgram.id, currentSectionItems, [], IMPORT_USER);
                } catch (error) {
                  console.warn(`Failed to update subprogram ${subProgram.id}:`, error);
                }
                programIds.push(subProgram.id);
              } catch (error) {
                console.warn(`Failed to create subprogram ${currentSectionName}:`, error);
              }
            } else {
              // dryRun + no existing subprogram: push placeholder for consistent counts
              programIds.push(`subprogram:${currentSectionName}`);
            }
          } catch (error) {
            console.warn(`Failed to check for existing subprogram ${currentSectionName}:`, error);
          }
        } else {
          // Create new subprogram (or placeholder in dryRun)
          if (!dryRun) {
            try {
              const subProgram = await createProgram(currentSectionName, IMPORT_USER, true, true, undefined, new Date());
              try {
                await updateProgramElementIds(subProgram.id, currentSectionItems, [], IMPORT_USER);
              } catch (error) {
                console.warn(`Failed to update subprogram ${subProgram.id}:`, error);
              }
              programIds.push(subProgram.id);
            } catch (error) {
              console.warn(`Failed to create subprogram ${currentSectionName}:`, error);
            }
          } else {
            programIds.push(`subprogram:${currentSectionName}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to flush section ${currentSectionName}:`, error);
      }
      currentSectionItems = [];
    }
    currentSectionName = null;
  };

  for (const item of items) {
    if (item.type === 'section') {
      try {
        await flushSection();
      } catch (error) {
        console.warn(`Failed to flush section:`, error);
      }
      currentSectionName = item.name;
      currentSectionNumber++;
    } else {
      try {
        const version = await getLatestVersionBySongTitle(item.name);
        const actTag = currentSectionNumber > 0 ? `act ${currentSectionNumber}` : null;
        if (version) {
          // Add act tag if we're in a section and not in dryRun
          if (actTag && !dryRun) {
            try {
              await addSongTags(version.songId, [actTag]);
            } catch (error) {
              console.warn(`Failed to add act tag to song ${version.songId}:`, error);
            }
          }
          if (currentSectionName) {
            currentSectionItems.push(version.id);
          } else {
            elementIds.push(version.id);
          }
        } else {
          // Create placeholder for missing item
          try {
            const placeholderId = await findOrCreateEmptyVersion(item.name, dryRun, actTag ? [actTag] : []);
            if (placeholderId) {
              if (currentSectionName) {
                currentSectionItems.push(placeholderId);
              } else {
                elementIds.push(placeholderId);
              }
              createdPlaceholders.push(item.name);
            } else {
              missingElements.push(item.name);
            }
          } catch (error) {
            console.warn(`Failed to create placeholder for ${item.name}:`, error);
            missingElements.push(item.name);
          }
        }
      } catch (error) {
        console.warn(`Failed to resolve item ${item.name}:`, error);
        missingElements.push(item.name);
      }
    }
  }
  await flushSection();

  return { elementIds, programIds, missingElements, createdPlaceholders };
};

// Derive program title from filename and optional subtitle in { }
// If subtitle differs from filename (after normalization), append it
const getProgramTitleFromFile = (fileName: string, parsedSubtitle: string | null): string => {
  const ext = path.extname(fileName).toLowerCase();
  const baseTitle = normalizeTitle(path.basename(fileName, ext));
  if (!parsedSubtitle) return baseTitle;
  const normalizedBase = baseTitle.toLowerCase();
  const normalizedSubtitle = parsedSubtitle.toLowerCase().replace(/_/g, ' ').trim();
  if (normalizedBase === normalizedSubtitle) return baseTitle;
  return `${baseTitle} - ${parsedSubtitle}`;
};

const parseProgramFile = (content: string): { title: string | null; items: ParsedProgramItem[] } => {
  const lines = content.split('\n');
  let title: string | null = null;
  const items: ParsedProgramItem[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    // Title in curly braces
    if (line.startsWith('{') && line.endsWith('}')) {
      title = line.slice(1, -1).trim();
      continue;
    }
    // Section header
    if (line.startsWith('#')) {
      const sectionName = line.slice(1).trim();
      if (sectionName) {
        items.push({ type: 'section', name: sectionName });
      }
      continue;
    }
    // Song reference (ignore any : suffix parameter)
    const colonIdx = line.indexOf(':');
    const songName = colonIdx > 0 ? line.slice(0, colonIdx).trim() : line;
    items.push({ type: 'song', name: normalizeTitle(songName) });
  }
  return { title, items };
};

export const importProgramFile = async (
  filePath: string,
  fileName: string,
  dryRun: boolean,
  onResult?: (result: ProgramImportResult) => void
): Promise<ProgramImportResult | null> => {
  const ext = path.extname(fileName).toLowerCase();
  if (ext !== '.list' && ext !== '.lst') return null;

  let buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch (err) {
    console.warn(`Failed to read program file ${filePath}:`, err);
    return null;
  }

  const content = buffer.toString('utf-8').trim();
  if (!content) return null;

  const parsed = parseProgramFile(content);
  const programTitle = getProgramTitleFromFile(fileName, parsed.title);

  // Check if program already exists
  let existingProgram;
  try {
    existingProgram = await getProgramByTitle(programTitle);
  } catch (error) {
    const result: ProgramImportResult = { title: programTitle, status: 'failed', error: `Failed to check existing program: ${error instanceof Error ? error.message : 'unknown error'}` };
    onResult?.(result);
    return result;
  }
  if (existingProgram) {
    const url = `/programs/${existingProgram.id}`;
    const result = { title: programTitle, status: 'exists', url };
    onResult?.(result);
    return result;
  }

  let elementIds: string[], programIds: string[], missingElements: string[], createdPlaceholders: string[];
  try {
    const resolved = await resolveProgramItems(parsed.items, dryRun, false);
    elementIds = resolved.elementIds;
    programIds = resolved.programIds;
    missingElements = resolved.missingElements;
    createdPlaceholders = resolved.createdPlaceholders;
  } catch (error) {
    const result: ProgramImportResult = { title: programTitle, status: 'failed', error: `Failed to resolve program items: ${error instanceof Error ? error.message : 'unknown error'}` };
    onResult?.(result);
    return result;
  }

  try {
    if (dryRun) {
      const result: ProgramImportResult = {
        title: programTitle,
        status: 'would-create',
        elementCount: elementIds.length + programIds.length,
        missingElements: missingElements.length > 0 ? missingElements : undefined,
        createdPlaceholders: createdPlaceholders.length > 0 ? createdPlaceholders : undefined,
      };
      onResult?.(result);
      return result;
    }

    let fileCreatedAt: string;
    try {
      fileCreatedAt = await getFileCreatedAt(filePath);
    } catch (error) {
      const result: ProgramImportResult = { title: programTitle, status: 'failed', error: `Failed to get file timestamp: ${error instanceof Error ? error.message : 'unknown error'}` };
      onResult?.(result);
      return result;
    }
    let program;
    try {
      program = await createProgram(programTitle, IMPORT_USER, false, true, fileCreatedAt, new Date());
    } catch (error) {
      const result: ProgramImportResult = { title: programTitle, status: 'failed', error: `Failed to create program: ${error instanceof Error ? error.message : 'unknown error'}` };
      onResult?.(result);
      return result;
    }
    try {
      await updateProgramElementIds(program.id, elementIds, programIds, IMPORT_USER);
    } catch (error) {
      const result: ProgramImportResult = { title: programTitle, status: 'failed', error: `Failed to update program elements: ${error instanceof Error ? error.message : 'unknown error'}` };
      onResult?.(result);
      return result;
    }
    const url = `/programs/${program.id}`;
    const result: ProgramImportResult = {
      title: programTitle,
      status: 'created',
      url,
      elementCount: elementIds.length + programIds.length,
      missingElements: missingElements.length > 0 ? missingElements : undefined,
      createdPlaceholders: createdPlaceholders.length > 0 ? createdPlaceholders : undefined,
    };
    onResult?.(result);
    return result;
  } catch (error) {
    const result: ProgramImportResult = { title: programTitle, status: 'failed', error: error instanceof Error ? error.message : 'unknown error' };
    onResult?.(result);
    return result;
  }
};

export type ProgramResyncResult = { title: string; status: string; url?: string; error?: string; addedElements?: number; createdPlaceholders?: string[] };

// Resync existing programs from .list files to pick up newly-imported songs.
// WARNING: This replaces the program's element list with the one from the .list file,
// overwriting any manual changes made through the app UI.
export const resyncProgramsFromFiles = async (
  programsDirs: string[],
  dryRun: boolean,
  onResult?: (result: ProgramResyncResult) => void
): Promise<ProgramResyncResult[]> => {
  const results: ProgramResyncResult[] = [];

  for (const programsDir of programsDirs) {
    let entries;
    try {
      entries = await fs.readdir(programsDir, { withFileTypes: true });
    } catch (err) {
      console.warn(`Failed to read programs directory ${programsDir}:`, err);
      continue;
    }

    for (const entry of entries.filter(e => e.isFile())) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext !== '.list' && ext !== '.lst') continue;

      let buffer;
      try {
        buffer = await fs.readFile(path.join(programsDir, entry.name));
      } catch (err) {
        continue;
      }

      const content = buffer.toString('utf-8').trim();
      if (!content) continue;

      const parsed = parseProgramFile(content);
      const programTitle = getProgramTitleFromFile(entry.name, parsed.title);

      // Check if program exists
      let existingProgram;
      try {
        existingProgram = await getProgramByTitle(programTitle);
      } catch (error) {
        console.warn(`Failed to check existing program ${programTitle}:`, error);
        continue;
      }
      if (!existingProgram) continue; // Only resync existing programs

      // Rebuild the full element list from the .list file using shared helper
      // reuseSubprograms=true so we update existing subprograms rather than creating new ones
      let elementIds: string[], programIds: string[], createdPlaceholders: string[];
      try {
        const resolved = await resolveProgramItems(parsed.items, dryRun, true);
        elementIds = resolved.elementIds;
        programIds = resolved.programIds;
        createdPlaceholders = resolved.createdPlaceholders;
      } catch (error) {
        const result: ProgramResyncResult = { title: programTitle, status: 'failed', error: `Failed to resolve program items: ${error instanceof Error ? error.message : 'unknown error'}` };
        results.push(result);
        onResult?.(result);
        continue;
      }

      // Check if anything changed
      const oldElementCount = existingProgram.elementIds.length + existingProgram.programIds.length;
      const newElementCount = elementIds.length + programIds.length;
      const addedElements = newElementCount - oldElementCount;

      if (addedElements === 0 && createdPlaceholders.length === 0) {
        continue; // Nothing to update
      }

      try {
        if (dryRun) {
          const result: ProgramResyncResult = {
            title: programTitle,
            status: 'would-resync',
            url: `/programs/${existingProgram.id}`,
            addedElements,
            createdPlaceholders: createdPlaceholders.length > 0 ? createdPlaceholders : undefined,
          };
          results.push(result);
          onResult?.(result);
        } else {
          try {
            await updateProgramElementIds(existingProgram.id, elementIds, programIds, IMPORT_USER);
            const result: ProgramResyncResult = {
              title: programTitle,
              status: 'resynced',
              url: `/programs/${existingProgram.id}`,
              addedElements,
              createdPlaceholders: createdPlaceholders.length > 0 ? createdPlaceholders : undefined,
            };
            results.push(result);
            onResult?.(result);
          } catch (error) {
            const result: ProgramResyncResult = { title: programTitle, status: 'failed', error: `Failed to update program: ${error instanceof Error ? error.message : 'unknown error'}` };
            results.push(result);
            onResult?.(result);
          }
        }
      } catch (error) {
        const result: ProgramResyncResult = { title: programTitle, status: 'failed', error: error instanceof Error ? error.message : 'unknown error' };
        results.push(result);
        onResult?.(result);
      }
    }
  }

  return results;
};

export const importFromDirectories = async (
  config: {
    songsDirs: { path: string; tags: string[] }[];
    speechesDirs: string[];
    programsDirs?: string[];
    activitiesConfig?: { listFile: string; speechesDir: string };
  },
  dryRun: boolean,
  onResult?: (type: 'song' | 'speech' | 'activity' | 'program' | 'resync', result: ImportResult | ProgramImportResult | ProgramResyncResult) => void
): Promise<{ songResults: ImportResult[]; speechResults: ImportResult[]; activityResults: ImportResult[]; programResults: ProgramImportResult[]; resyncResults: ProgramResyncResult[] }> => {
  const songResults: ImportResult[] = [];
  const speechResults: ImportResult[] = [];
  const activityResults: ImportResult[] = [];
  const programResults: ProgramImportResult[] = [];

  // Import speeches
  for (const speechesDir of config.speechesDirs) {
    let entries;
    try {
      entries = await fs.readdir(speechesDir, { withFileTypes: true });
    } catch (err) {
      console.warn(`Failed to read speeches directory ${speechesDir}:`, err);
      continue;
    }

    await runWithLimit(entries.filter(e => e.isFile()), 8, async (entry) => {
      try {
        const result = await importSpeechFile(
          path.join(speechesDir, entry.name),
          entry.name,
          dryRun,
          (r) => onResult?.('speech', r)
        );
        if (result) speechResults.push(result);
      } catch (error) {
        const result: ImportResult = { title: entry.name, label: entry.name, status: 'failed', error: error instanceof Error ? error.message : 'unknown error' };
        speechResults.push(result);
        onResult?.('speech', result);
      }
    });
  }

  // Import activities (speeches that are listed in All_Activities.list)
  if (config.activitiesConfig) {
    const results = await importActivitiesFromList(
      config.activitiesConfig.listFile,
      config.activitiesConfig.speechesDir,
      dryRun,
      (r) => onResult?.('activity', r)
    );
    activityResults.push(...results);
  }

  // Import songs
  for (const songsConfig of config.songsDirs) {
    let entries;
    try {
      entries = await fs.readdir(songsConfig.path, { withFileTypes: true });
    } catch (err) {
      console.warn(`Failed to read songs directory ${songsConfig.path}:`, err);
      continue;
    }

    await runWithLimit(entries.filter(e => e.isDirectory()), 4, async (dir) => {
      try {
        const results = await importSongDirectory(
          path.join(songsConfig.path, dir.name),
          dir.name,
          songsConfig.tags,
          dryRun,
          (r) => onResult?.('song', r)
        );
        songResults.push(...results);
      } catch (error) {
        const result: ImportResult = { title: dir.name, label: '', status: 'failed', error: error instanceof Error ? error.message : 'unknown error' };
        songResults.push(result);
        onResult?.('song', result);
      }
    });
  }

  // Import programs (run after songs so we can resolve references)
  for (const programsDir of config.programsDirs ?? []) {
    let entries;
    try {
      entries = await fs.readdir(programsDir, { withFileTypes: true });
    } catch (err) {
      console.warn(`Failed to read programs directory ${programsDir}:`, err);
      continue;
    }

    // Process programs sequentially to avoid race conditions with subprogram creation
    for (const entry of entries.filter(e => e.isFile())) {
      try {
        const result = await importProgramFile(
          path.join(programsDir, entry.name),
          entry.name,
          dryRun,
          (r) => onResult?.('program', r)
        );
        if (result) programResults.push(result);
      } catch (error) {
        const result: ProgramImportResult = { title: entry.name, status: 'failed', error: error instanceof Error ? error.message : 'unknown error' };
        programResults.push(result);
        onResult?.('program', result);
      }
    }
  }

  // Resync existing programs to pick up newly-available items
  let resyncResults: ProgramResyncResult[] = [];
  try {
    resyncResults = await resyncProgramsFromFiles(
      config.programsDirs ?? [],
      dryRun,
      (r) => onResult?.('resync', r)
    );
  } catch (error) {
    console.warn('Failed to resync programs:', error);
  }

  return { songResults, speechResults, activityResults, programResults, resyncResults };
};
