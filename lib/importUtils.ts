import path from 'path';
import { promises as fs } from 'fs';
import { put } from '@vercel/blob';
import { createSong, createVersionWithLineage, findVersionBySongTitleAndLabel, getLatestVersionBySongTitle } from './songsRepository';
import { createProgram, getProgramByTitle, updateProgramElementIds } from './programsRepository';
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
  const token = process.env.secular_solstice__READ_WRITE_TOKEN;
  if (!token) throw new Error('Blob storage token not configured (secular_solstice__READ_WRITE_TOKEN)');
  const ext = path.extname(fileName).toLowerCase();
  const contentType = getMimeType(ext);
  const safeName = fileName.replace(/\//g, '-');
  const blob = await put(`song-${songId}/import-${Date.now()}-${safeName}`, buffer, { access: 'public', contentType, token });
  return blob.url;
};

const normalizeTitle = (name: string) => name.replace(/_/g, ' ').trim();

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

const getLatestVersionId = async (songId: string) => {
  const rows = await sql`select id from song_versions where song_id = ${songId} and archived = false and next_version_id is null order by created_at desc limit 1`;
  return rows.length > 0 ? (rows[0] as { id: string }).id : null;
};

const getFileCreatedAt = async (filePath: string) => {
  const stats = await fs.stat(filePath);
  return stats.mtime.toISOString();
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

const SKIP_FILES = new Set(['Makefile', '.DS_Store']);
const SKIP_DIRS = new Set(['gen', 'node_modules', '.git']);

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

    if (SKIP_FILES.has(entry.name)) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (AUDIO_EXTENSION_SET.has(ext)) continue; // Skip audio files (handle separately)

    const buffer = await fs.readFile(fullPath);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    const isText = isValidTextContent(buffer);
    files.push({ fullPath, relativePath, buffer, isText });
  }
  return files;
};

export type ImportResult = { title: string; label: string; status: string; url?: string; error?: string };

const versionUrl = (versionId: string | null | undefined) => versionId ? `/songs/${versionId}` : undefined;

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
  if (dryRun) {
    const existingSong = await getSongByTitle(songTitle);
    songId = existingSong ? existingSong.id : null;
  } else {
    songId = await ensureSong(songTitle, tags);
  }

  const files = await collectFiles(songDirPath, songDirPath);
  if (files.length === 0) return results;

  for (const file of files) {
    const sourceLabel = file.relativePath;
    const label = normalizeTitle(sourceLabel);
    const createdAt = await getFileCreatedAt(file.fullPath);
    const existingVersion = await findExistingVersion(songTitle, [label, sourceLabel], createdAt);

    if (existingVersion?.matches) {
      const url = versionUrl(existingVersion.existing?.id);
      const result = { title: songTitle, label, status: 'exists', url };
      results.push(result);
      onResult?.(result);
      continue;
    }

    try {
      const existingUrl = existingVersion ? versionUrl(existingVersion.existing?.id) : undefined;
      if (dryRun) {
        const statusType = file.isText ? 'would-create' : 'would-create-binary';
        const result = { title: songTitle, label, status: statusType, url: existingUrl };
        results.push(result);
        onResult?.(result);
      } else {
        const previousVersionId = await getLatestVersionId(songId!);
        if (file.isText) {
          const content = file.buffer.toString('utf-8');
          const created = await createVersionWithLineage({
            songId: songId!, label, content, previousVersionId, createdBy: IMPORT_USER, createdAt,
          });
          const url = versionUrl(created.id);
          const result = { title: songTitle, label, status: 'created', url };
          results.push(result);
          onResult?.(result);
        } else {
          const blobUrl = await uploadToBlob(file.buffer, songId!, sourceLabel);
          const created = await createVersionWithLineage({
            songId: songId!, label, content: null, blobUrl, previousVersionId, createdBy: IMPORT_USER, createdAt,
          });
          const url = versionUrl(created.id);
          const result = { title: songTitle, label, status: 'created-binary', url };
          results.push(result);
          onResult?.(result);
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

export const importSpeechFile = async (
  filePath: string,
  fileName: string,
  dryRun: boolean,
  onResult?: (result: ImportResult) => void
): Promise<ImportResult | null> => {
  const ext = path.extname(fileName).toLowerCase();
  if (AUDIO_EXTENSION_SET.has(ext)) return null;

  let buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch (err) {
    console.warn(`Failed to read speech file ${filePath}:`, err);
    return null;
  }

  if (!isValidTextContent(buffer)) return null;

  const title = normalizeTitle(path.basename(fileName, ext || undefined));
  const sourceLabel = fileName;
  const label = normalizeTitle(sourceLabel);
  const content = buffer.toString('utf-8').trim();
  if (!content) return null;

  let songId: string | null = null;
  if (dryRun) {
    const existingSong = await getSongByTitle(title);
    songId = existingSong ? existingSong.id : null;
  } else {
    songId = await ensureSong(title, ['speech']);
  }

  const createdAt = await getFileCreatedAt(filePath);
  const existingVersion = await findExistingVersion(title, [label, sourceLabel], createdAt);

  if (existingVersion?.matches) {
    const url = versionUrl(existingVersion.existing?.id);
    const result = { title, label, status: 'exists', url };
    onResult?.(result);
    return result;
  }

  try {
    const existingUrl = existingVersion ? versionUrl(existingVersion.existing?.id) : undefined;
    if (dryRun) {
      const result = { title, label, status: 'would-create', url: existingUrl };
      onResult?.(result);
      return result;
    } else {
      const previousVersionId = await getLatestVersionId(songId!);
      const created = await createVersionWithLineage({
        songId: songId!, label, content, previousVersionId, createdBy: IMPORT_USER, createdAt,
      });
      const url = versionUrl(created.id);
      const result = { title, label, status: 'created', url };
      onResult?.(result);
      return result;
    }
  } catch (error) {
    const result = { title, label, status: 'failed', error: error instanceof Error ? error.message : 'unknown error' };
    onResult?.(result);
    return result;
  }
};

export type ProgramImportResult = { title: string; status: string; url?: string; error?: string; elementCount?: number; missingElements?: string[] };

type ParsedProgramItem = { type: 'song' | 'section'; name: string };

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
  const programTitle = parsed.title || normalizeTitle(path.basename(fileName, ext));

  // Check if program already exists
  const existingProgram = await getProgramByTitle(programTitle);
  if (existingProgram) {
    const url = `/programs/${existingProgram.id}`;
    const result = { title: programTitle, status: 'exists', url };
    onResult?.(result);
    return result;
  }

  // Resolve song references to version IDs
  const elementIds: string[] = [];
  const programIds: string[] = [];
  const missingElements: string[] = [];
  let currentSectionItems: string[] = [];
  let currentSectionName: string | null = null;

  const flushSection = async () => {
    if (currentSectionName && currentSectionItems.length > 0) {
      // Create subprogram for section
      if (!dryRun) {
        const subProgram = await createProgram(currentSectionName, IMPORT_USER, true);
        await updateProgramElementIds(subProgram.id, currentSectionItems, []);
        programIds.push(subProgram.id);
      } else {
        programIds.push(`subprogram:${currentSectionName}`);
      }
      currentSectionItems = [];
    }
    currentSectionName = null;
  };

  for (const item of parsed.items) {
    if (item.type === 'section') {
      await flushSection();
      currentSectionName = item.name;
    } else {
      const version = await getLatestVersionBySongTitle(item.name);
      if (version) {
        if (currentSectionName) {
          currentSectionItems.push(version.id);
        } else {
          elementIds.push(version.id);
        }
      } else {
        missingElements.push(item.name);
      }
    }
  }
  await flushSection();

  try {
    if (dryRun) {
      const result: ProgramImportResult = {
        title: programTitle,
        status: 'would-create',
        elementCount: elementIds.length + programIds.length,
        missingElements: missingElements.length > 0 ? missingElements : undefined,
      };
      onResult?.(result);
      return result;
    }

    const program = await createProgram(programTitle, IMPORT_USER);
    await updateProgramElementIds(program.id, elementIds, programIds);
    const url = `/programs/${program.id}`;
    const result: ProgramImportResult = {
      title: programTitle,
      status: 'created',
      url,
      elementCount: elementIds.length + programIds.length,
      missingElements: missingElements.length > 0 ? missingElements : undefined,
    };
    onResult?.(result);
    return result;
  } catch (error) {
    const result: ProgramImportResult = { title: programTitle, status: 'failed', error: error instanceof Error ? error.message : 'unknown error' };
    onResult?.(result);
    return result;
  }
};

export const importFromDirectories = async (
  config: {
    songsDirs: { path: string; tags: string[] }[];
    speechesDirs: string[];
    programsDirs?: string[];
  },
  dryRun: boolean,
  onResult?: (type: 'song' | 'speech' | 'program', result: ImportResult | ProgramImportResult) => void
): Promise<{ songResults: ImportResult[]; speechResults: ImportResult[]; programResults: ProgramImportResult[] }> => {
  const songResults: ImportResult[] = [];
  const speechResults: ImportResult[] = [];
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
      const result = await importSpeechFile(
        path.join(speechesDir, entry.name),
        entry.name,
        dryRun,
        (r) => onResult?.('speech', r)
      );
      if (result) speechResults.push(result);
    });
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
      const results = await importSongDirectory(
        path.join(songsConfig.path, dir.name),
        dir.name,
        songsConfig.tags,
        dryRun,
        (r) => onResult?.('song', r)
      );
      songResults.push(...results);
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
      const result = await importProgramFile(
        path.join(programsDir, entry.name),
        entry.name,
        dryRun,
        (r) => onResult?.('program', r)
      );
      if (result) programResults.push(result);
    }
  }

  return { songResults, speechResults, programResults };
};
