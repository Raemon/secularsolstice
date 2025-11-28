import path from 'path';
import { promises as fs } from 'fs';
import dotenv from 'dotenv';
import sql from '../lib/db';
import { AUDIO_EXTENSION_SET } from '../lib/audioExtensions';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SONGS_DIR = path.join(process.cwd(), 'songs');
const TEXT_EXTENSIONS = new Set(['.txt', '.ugc', '.md', '.lrc', '.ly', '.json', '.abc', '.rtf']);

const ensureSongsDirectory = async () => {
  try {
    const stats = await fs.stat(SONGS_DIR);
    if (!stats.isDirectory()) {
      throw new Error(`${SONGS_DIR} exists but is not a directory`);
    }
  } catch (error) {
    throw new Error(`Songs directory not found at ${SONGS_DIR}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const query = async <T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> => {
  const result = await sql(strings, ...values);
  return result as T[];
};

const upsertSong = async (title: string) => {
  const existing = await query<{ id: string }>`select id from songs where title = ${title} limit 1`;
  if (existing.length > 0) {
    return existing[0].id;
  }
  const inserted = await query<{ id: string }>`insert into songs (title) values (${title}) returning id`;
  return inserted[0].id;
};

const songAlreadyImported = async (songId: string) => {
  const result = await query<{ count: string }>`select count(1) as count from song_versions where song_id = ${songId}`;
  return Number(result[0].count) > 0;
};

const importSongDirectory = async (dirName: string) => {
  const title = dirName;
  const songId = await upsertSong(title);

  if (await songAlreadyImported(songId)) {
    console.log(`Skipping "${title}" (versions already exist)`);
    return;
  }

  const dirPath = path.join(SONGS_DIR, dirName);
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).sort((a, b) => a.name.localeCompare(b.name));

  let previousVersionId: string | null = null;

  for (const file of files) {
    const filePath = path.join(dirPath, file.name);
    const ext = path.extname(file.name).toLowerCase();

    if (AUDIO_EXTENSION_SET.has(ext)) {
      console.log(`Audio file detected (${dirName}/${file.name}). Upload manually and set audio_url on a version later.`);
      continue;
    }

    if (!TEXT_EXTENSIONS.has(ext)) {
      console.log(`Skipping unsupported file type (${dirName}/${file.name})`);
      continue;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const inserted: { id: string }[] = await query<{ id: string }>`
      insert into song_versions (song_id, label, content, previous_version_id)
      values (${songId}, ${file.name}, ${content}, ${previousVersionId})
      returning id
    `;

    previousVersionId = inserted[0].id;
    console.log(`Imported ${dirName}/${file.name}`);
  }
};

const run = async () => {
  await ensureSongsDirectory();
  const entries = await fs.readdir(SONGS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    await importSongDirectory(entry.name);
  }
  console.log('Import complete.');
};

run().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});

