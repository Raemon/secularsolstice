import sql from '@/lib/db';
import { latestProgramVersionCte } from '@/lib/programsRepository';

export const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

export const getSongBlobPrefix = async (songId: string | null): Promise<string> => {
  if (!songId) return 'song-unknown';
  const songs = await sql`SELECT title FROM songs WHERE id = ${songId}::uuid`;
  const title = songs[0]?.title;
  return title ? `${slugify(title)}-${songId}` : `song-${songId}`;
};

export const getProgramBlobPrefix = async (programId: string): Promise<string> => {
  const programs = await sql`
    with latest_versions as (${latestProgramVersionCte()})
    SELECT lv.title FROM programs p
    JOIN latest_versions lv ON lv.program_id = p.id
    WHERE p.id = ${programId}::uuid
  `;
  const title = programs[0]?.title;
  return title ? `${slugify(title)}-${programId}` : `program-${programId}`;
};
