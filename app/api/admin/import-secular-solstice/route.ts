import path from 'path';
import { promises as fs, Dirent } from 'fs';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { createSong, createVersionWithLineage, findVersionBySongTitleAndLabel } from '@/lib/songsRepository';
import { AUDIO_EXTENSION_SET } from '@/lib/audioExtensions';

const IMPORT_USER = 'secularsolstice-import';
const SECULAR_ROOT = path.join(process.cwd(), 'SecularSolstice.github.io-master');
const SPEECHES_DIR = path.join(SECULAR_ROOT, 'speeches');
const SONGS_DIR = path.join(process.cwd(), 'songs');

const TEXT_EXTENSIONS = new Set(['', '.txt', '.ugc', '.md', '.lrc', '.ly', '.json', '.abc', '.rtf', '.cho', '.csv', '.html']);

const normalizeTitle = (name: string) => name.replace(/_/g, ' ').trim();

const isProbablyText = (buffer: Buffer) => !buffer.includes(0);

const getSongByTitle = async (title: string) => {
  const rows = await sql`select id, tags from songs where title = ${title} and archived = false limit 1`;
  return rows.length > 0 ? rows[0] as { id: string; tags: string[] | null } : null;
};

const ensureSong = async (title: string, tags: string[]) => {
  const existing = await getSongByTitle(title);
  if (existing) {
    return existing.id;
  }
  const created = await createSong(title, IMPORT_USER, tags);
  return created.id;
};

const getLatestVersionId = async (songId: string) => {
  const rows = await sql`select id from song_versions where song_id = ${songId} and archived = false and next_version_id is null order by created_at desc limit 1`;
  return rows.length > 0 ? (rows[0] as { id: string }).id : null;
};

const readTextFile = async (filePath: string) => {
  const ext = path.extname(filePath).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) {
    return null;
  }
  const buffer = await fs.readFile(filePath);
  if (!isProbablyText(buffer)) {
    return null;
  }
  return buffer.toString('utf-8').trim();
};

const runWithLimit = async <T>(items: T[], limit: number, worker: (item: T) => Promise<void>) => {
  const executing: Promise<void>[] = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => worker(item)).finally(() => {
      const idx = executing.indexOf(p);
      if (idx >= 0) {
        executing.splice(idx, 1);
      }
    });
    executing.push(p);
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
};

const getFileCreatedAt = async (filePath: string) => {
  const stats = await fs.stat(filePath);
  return stats.mtime.toISOString();
};

const timestampsMatch = (existing: string, candidate: string) => new Date(existing).toISOString() === new Date(candidate).toISOString();

const findExistingVersion = async (songTitle: string, labels: string[], createdAt: string) => {
  for (const label of labels) {
    const existing = await findVersionBySongTitleAndLabel(songTitle, label);
    if (existing) {
      const matches = existing.createdAt ? timestampsMatch(existing.createdAt, createdAt) : false;
      return { existing, matches };
    }
  }
  return null;
};

const versionUrl = (versionId: string | null | undefined) => versionId ? `/songs/${versionId}` : undefined;

const importSpeechFiles = async (dryRun: boolean, onResult?: (result: { title: string; label: string; status: string; url?: string; error?: string }) => void) => {
  const results: { title: string; label: string; status: string; url?: string; error?: string }[] = [];
  let entries: Dirent[] = [];

  try {
    entries = await fs.readdir(SPEECHES_DIR, { withFileTypes: true });
  } catch (error) {
    results.push({ title: 'speeches', label: 'all', status: 'skipped', error: 'speech directory missing' });
    return results;
  }

  await runWithLimit(entries, 8, async (entry) => {
    if (!entry.isFile()) {
      return;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (AUDIO_EXTENSION_SET.has(ext)) {
      return;
    }
    const filePath = path.join(SPEECHES_DIR, entry.name);
    const content = await readTextFile(filePath);
    if (!content) {
      return;
    }

    const title = normalizeTitle(path.basename(entry.name, ext || undefined));
    const sourceLabel = entry.name;
    const label = normalizeTitle(sourceLabel);
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
      results.push({ title, label, status: 'exists', url });
      onResult?.({ title, label, status: 'exists', url });
      return;
    }

    try {
      const existingUrl = existingVersion ? versionUrl(existingVersion.existing?.id) : undefined;
      if (dryRun) {
        results.push({ title, label, status: 'would-create', url: existingUrl });
        onResult?.({ title, label, status: 'would-create', url: existingUrl });
      } else {
        const previousVersionId = await getLatestVersionId(songId!);
        const created = await createVersionWithLineage({
          songId: songId!,
          label,
          content,
          previousVersionId,
          createdBy: IMPORT_USER,
          createdAt,
        });
        const url = versionUrl(created.id);
        results.push({ title, label, status: 'created', url });
        onResult?.({ title, label, status: 'created', url });
      }
    } catch (error) {
      results.push({ title, label, status: 'failed', error: error instanceof Error ? error.message : 'unknown error' });
      onResult?.({ title, label, status: 'failed', error: error instanceof Error ? error.message : 'unknown error' });
    }
  });

  return results;
};

const collectTextFiles = async (dirPath: string) => {
  const files: string[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'gen' || entry.name.startsWith('.')) {
        continue;
      }
      files.push(...await collectTextFiles(fullPath));
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (AUDIO_EXTENSION_SET.has(ext)) {
      continue;
    }
    const content = await readTextFile(fullPath);
    if (content) {
      files.push(fullPath);
    }
  }
  return files;
};

const importSongFiles = async (dryRun: boolean, onResult?: (result: { title: string; label: string; status: string; url?: string; error?: string }) => void) => {
  const results: { title: string; label: string; status: string; url?: string; error?: string }[] = [];
  let songDirs: Dirent[] = [];

  try {
    songDirs = await fs.readdir(SONGS_DIR, { withFileTypes: true });
  } catch (error) {
    results.push({ title: 'songs', label: 'all', status: 'skipped', error: 'songs directory missing' });
    return results;
  }

  await runWithLimit(songDirs, 4, async (dir) => {
    if (!dir.isDirectory()) {
      return;
    }

    const songTitle = normalizeTitle(dir.name);
    let songId: string | null = null;
    if (dryRun) {
      const existingSong = await getSongByTitle(songTitle);
      songId = existingSong ? existingSong.id : null;
    } else {
      songId = await ensureSong(songTitle, ['song']);
    }
    const textFiles = await collectTextFiles(path.join(SONGS_DIR, dir.name));

    for (const filePath of textFiles) {
      const relPath = path.relative(path.join(SONGS_DIR, dir.name), filePath);
      const sourceLabel = relPath.replace(new RegExp(path.sep, 'g'), '/');
      const label = normalizeTitle(sourceLabel);
      const createdAt = await getFileCreatedAt(filePath);
      const existingVersion = await findExistingVersion(songTitle, [label, sourceLabel], createdAt);
      if (existingVersion?.matches) {
        const url = versionUrl(existingVersion.existing?.id);
        results.push({ title: songTitle, label, status: 'exists', url });
        onResult?.({ title: songTitle, label, status: 'exists', url });
        continue;
      }

      const content = await readTextFile(filePath);
      if (!content) {
        continue;
      }

      try {
        const existingUrl = existingVersion ? versionUrl(existingVersion.existing?.id) : undefined;
        if (dryRun) {
          results.push({ title: songTitle, label, status: 'would-create', url: existingUrl });
          onResult?.({ title: songTitle, label, status: 'would-create', url: existingUrl });
        } else {
          const previousVersionId = await getLatestVersionId(songId!);
          const created = await createVersionWithLineage({
            songId: songId!,
            label,
            content,
            previousVersionId,
            createdBy: IMPORT_USER,
            createdAt,
          });
          const url = versionUrl(created.id);
          results.push({ title: songTitle, label, status: 'created', url });
          onResult?.({ title: songTitle, label, status: 'created', url });
        }
      } catch (error) {
        results.push({ title: songTitle, label, status: 'failed', error: error instanceof Error ? error.message : 'unknown error' });
        onResult?.({ title: songTitle, label, status: 'failed', error: error instanceof Error ? error.message : 'unknown error' });
      }
    }
  });

  return results;
};

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const dryRun = url.searchParams.get('dryRun') === 'true';
    const stream = url.searchParams.get('stream') === 'true';

    if (stream) {
      const encoder = new TextEncoder();
      const streamBody = new ReadableStream({
        async start(controller) {
          const send = (data: unknown) => controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
          try {
            const speechResults = await importSpeechFiles(dryRun, (result) => send({ type: 'speech', ...result }));
            const songResults = await importSongFiles(dryRun, (result) => send({ type: 'song', ...result }));
            send({ type: 'summary', speechResults, songResults });
          } catch (error) {
            send({ type: 'error', error: error instanceof Error ? error.message : 'Failed to import content' });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(streamBody, {
        headers: {
          'Content-Type': 'application/x-ndjson',
        },
      });
    }

    const speechResults = await importSpeechFiles(dryRun);
    const songResults = await importSongFiles(dryRun);

    return NextResponse.json({
      speechResults,
      songResults,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}