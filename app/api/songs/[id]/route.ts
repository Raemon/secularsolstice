import { NextResponse } from 'next/server';
import { getSongWithVersions, updateSongTags, updateSongTitle, archiveSong } from '@/lib/songsRepository';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const song = await getSongWithVersions(params.id);
    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }
    return NextResponse.json({ song });
  } catch (error) {
    console.error('Failed to load song:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack, hasDatabaseUrl: !!process.env.DATABASE_URL });
    return NextResponse.json({ 
      error: 'Failed to load song',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const body = await request.json();
    const { tags, title, archived } = body;
    
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400 });
      }
      const updatedSong = await updateSongTitle(params.id, title.trim());
      return NextResponse.json({ song: updatedSong });
    }
    
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return NextResponse.json({ error: 'tags must be an array' }, { status: 400 });
      }
      const updatedSong = await updateSongTags(params.id, tags);
      return NextResponse.json({ song: updatedSong });
    }
    
    if (archived !== undefined) {
      if (typeof archived !== 'boolean') {
        return NextResponse.json({ error: 'archived must be a boolean' }, { status: 400 });
      }
      const updatedSong = await archiveSong(params.id, archived);
      return NextResponse.json({ song: updatedSong });
    }
    
    return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
  } catch (error) {
    console.error('Failed to update song:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: 'Failed to update song',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

