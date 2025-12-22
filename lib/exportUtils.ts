import JSZip from 'jszip';
import type { SongWithVersions } from '@/lib/songsRepository';
import type { ProgramRecord } from '@/lib/programsRepository';

export const sanitizeFileName = (name: string) => {
  const cleaned = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  const collapsedSpaces = cleaned.replace(/\s+/g, ' ');
  return collapsedSpaces || 'untitled';
};

type BlobFile = { url: string; data: ArrayBuffer; filename: string };
type VersionBlobs = Record<string, BlobFile[]>; // versionId -> files

const getFilenameFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() || 'file';
    return filename;
  } catch {
    return 'file';
  }
};

const buildExportZip = (songs: SongWithVersions[], programs?: ProgramRecord[], versionBlobs?: VersionBlobs): JSZip => {
  const zip = new JSZip();
  const rootFolder = zip.folder('songs_export');
  if (!rootFolder) {
    throw new Error('Could not initialize download archive');
  }

  songs.forEach((song) => {
    const songFolderName = `${sanitizeFileName(song.title || 'song')}___${song.id}`;
    const songFolder = rootFolder.folder(songFolderName);
    if (!songFolder) return;

    const versionsFolder = songFolder.folder('versions');
    if (!versionsFolder) return;

    song.versions.forEach((version) => {
      const versionFolderName = `${sanitizeFileName(version.label)}___${version.id}`;
      const versionFolder = versionsFolder.folder(versionFolderName);
      if (!versionFolder) return;

      const contentText = version.content ?? '';
      const labelFilename = sanitizeFileName(version.label);
      versionFolder.file(labelFilename, contentText || 'No stored content for this version.');
      versionFolder.file('data.json', JSON.stringify(version, null, 2));

      // Add blob files if available
      const blobs = versionBlobs?.[version.id];
      if (blobs && blobs.length > 0) {
        const filesFolder = versionFolder.folder('files');
        if (filesFolder) {
          blobs.forEach((blob) => {
            filesFolder.file(blob.filename, blob.data);
          });
        }
      }
    });
  });

  // Add programs folder if provided
  if (programs && programs.length > 0) {
    const programsFolder = rootFolder.folder('programs');
    if (programsFolder) {
      programsFolder.file('data.json', JSON.stringify(programs, null, 2));
    }
  }

  return zip;
};

export const generateSongsExportZip = async (songs: SongWithVersions[]): Promise<Blob> => {
  return buildExportZip(songs).generateAsync({ type: 'blob' });
};

export const generateSongsExportBuffer = async (songs: SongWithVersions[]): Promise<Buffer> => {
  return buildExportZip(songs).generateAsync({ type: 'nodebuffer' });
};

// Fetch blob files for all versions that have a blobUrl
export const fetchVersionBlobs = async (songs: SongWithVersions[]): Promise<VersionBlobs> => {
  const versionBlobs: VersionBlobs = {};
  const fetchPromises: Promise<void>[] = [];

  for (const song of songs) {
    for (const version of song.versions) {
      if (version.blobUrl) {
        const promise = (async () => {
          try {
            const response = await fetch(version.blobUrl!);
            if (response.ok) {
              const data = await response.arrayBuffer();
              const filename = getFilenameFromUrl(version.blobUrl!);
              versionBlobs[version.id] = versionBlobs[version.id] || [];
              versionBlobs[version.id].push({ url: version.blobUrl!, data, filename });
            }
          } catch (err) {
            console.error(`Failed to fetch blob for version ${version.id}:`, err);
          }
        })();
        fetchPromises.push(promise);
      }
    }
  }

  await Promise.all(fetchPromises);
  return versionBlobs;
};

export const generateFullExportBuffer = async (songs: SongWithVersions[], programs: ProgramRecord[]): Promise<Buffer> => {
  const versionBlobs = await fetchVersionBlobs(songs);
  return buildExportZip(songs, programs, versionBlobs).generateAsync({ type: 'nodebuffer' });
};
