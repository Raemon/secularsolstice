import { NextResponse } from 'next/server';
import { createSong, findVersionBySongTitleAndLabel, listSongsWithVersions, createVersionWithLineage } from '@/lib/songsRepository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const songTitle = searchParams.get('song');
    const fileLabel = searchParams.get('file');

    if (songTitle && fileLabel) {
      const version = await findVersionBySongTitleAndLabel(songTitle, fileLabel);
      if (!version) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      if (version.audioUrl) {
        return NextResponse.json({ audioUrl: version.audioUrl });
      }
      if (!version.content) {
        return NextResponse.json({ error: 'No content available' }, { status: 404 });
      }
      return NextResponse.json({ content: version.content });
    }

    const songs = await listSongsWithVersions();
    return NextResponse.json({ songs });
  } catch (error) {
    console.error('Failed to load songs from database:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack, hasDatabaseUrl: !!process.env.DATABASE_URL });
    return NextResponse.json({ 
      error: 'Failed to load songs',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, createdBy, versionLabel, tags } = body;
    
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    const song = await createSong(title.trim(), createdBy ?? null, tags);
    
    let version = null;
    if (versionLabel && typeof versionLabel === 'string' && versionLabel.trim()) {
      version = await createVersionWithLineage({
        songId: song.id,
        label: versionLabel.trim(),
        content: null,
        createdBy: createdBy ?? null,
        slideCredits: null,
        programCredits: null,
      });
    }
    
    return NextResponse.json({ song, version });
  } catch (error) {
    console.error('Failed to create song:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: 'Failed to create song',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

