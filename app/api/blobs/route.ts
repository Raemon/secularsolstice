import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import sql from '@/lib/db';

const parsePathname = (pathname: string): { type: 'song' | 'program' | null; id: string | null } => {
  // Old format: song-{uuid}/... or program-{uuid}/...
  const oldSongMatch = pathname.match(/^song-([a-f0-9-]{36})\//);
  if (oldSongMatch) return { type: 'song', id: oldSongMatch[1] };
  const oldProgramMatch = pathname.match(/^program-([a-f0-9-]{36})\//);
  if (oldProgramMatch) return { type: 'program', id: oldProgramMatch[1] };
  // New format: {slugified-title}-{uuid}/... - extract UUID from end of first path segment
  const uuidMatch = pathname.match(/^[^/]+-([a-f0-9-]{36})\//);
  if (uuidMatch) {
    const id = uuidMatch[1];
    // Determine type by checking filename pattern
    if (pathname.includes('/blob-') || pathname.includes('/slides-movie-')) return { type: 'song', id };
    if (pathname.includes('/video-')) return { type: 'program', id };
  }
  return { type: null, id: null };
};

export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Blob storage token not configured' }, { status: 500 });
    }

    const allBlobs: { pathname: string; url: string; size: number; uploadedAt: Date }[] = [];
    let cursor: string | undefined;

    do {
      const result = await list({ token, cursor, limit: 1000 });
      allBlobs.push(...result.blobs.map(b => ({
        pathname: b.pathname,
        url: b.url,
        size: b.size,
        uploadedAt: b.uploadedAt
      })));
      cursor = result.cursor;
    } while (cursor);

    // Extract unique song and program IDs
    const songIds = new Set<string>();
    const programIds = new Set<string>();
    for (const blob of allBlobs) {
      const { type, id } = parsePathname(blob.pathname);
      if (type === 'song' && id) songIds.add(id);
      if (type === 'program' && id) programIds.add(id);
    }

    // Fetch titles from database
    const songTitles: Record<string, string> = {};
    const programTitles: Record<string, string> = {};

    if (songIds.size > 0) {
      const songIdsArray = Array.from(songIds);
      const songs = await sql`SELECT id, title FROM songs WHERE id = ANY(${songIdsArray}::uuid[])`;
      for (const song of songs) songTitles[song.id] = song.title;
    }

    if (programIds.size > 0) {
      const programIdsArray = Array.from(programIds);
      const programs = await sql`SELECT id, title FROM programs WHERE id = ANY(${programIdsArray}::uuid[])`;
      for (const program of programs) programTitles[program.id] = program.title;
    }

    // Enrich blobs with titles
    const enrichedBlobs = allBlobs.map(blob => {
      const { type, id } = parsePathname(blob.pathname);
      let displayName = blob.pathname;
      if (type === 'song' && id && songTitles[id]) {
        displayName = `${songTitles[id]} (${id})/${blob.pathname.split('/').slice(1).join('/')}`;
      } else if (type === 'program' && id && programTitles[id]) {
        displayName = `${programTitles[id]} (${id})/${blob.pathname.split('/').slice(1).join('/')}`;
      }
      return { ...blob, displayName };
    });

    return NextResponse.json({ blobs: enrichedBlobs });
  } catch (error) {
    console.error('Error listing blobs:', error);
    return NextResponse.json({ error: 'Failed to list blobs' }, { status: 500 });
  }
}
