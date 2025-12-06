import { NextResponse } from 'next/server';
import { createVersionWithLineage, updateVersionRenderedContent } from '@/lib/songsRepository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { songId, label, content, audioUrl, slidesMovieUrl, bpm, transpose, previousVersionId, createdBy, renderedContent, slideCredits, programCredits } = body;
    
    if (!songId || !label) {
      return NextResponse.json({ error: 'songId and label are required' }, { status: 400 });
    }

    if (!createdBy || typeof createdBy !== 'string' || createdBy.trim().length < 3) {
      return NextResponse.json({ error: 'createdBy is required and must be at least 3 characters' }, { status: 400 });
    }

    const newVersion = await createVersionWithLineage({
      songId,
      label,
      content: content ?? null,
      audioUrl: audioUrl ?? null,
      slidesMovieUrl: slidesMovieUrl ?? null,
      bpm: bpm ?? null,
      transpose: transpose ?? null,
      previousVersionId: previousVersionId ?? null,
      createdBy: createdBy.trim(),
      slideCredits: slideCredits ?? null,
      programCredits: programCredits ?? null,
    });

    // If client provided pre-rendered content, save it
    if (renderedContent && Object.keys(renderedContent).length > 0) {
      await updateVersionRenderedContent(newVersion.id, renderedContent);
      return NextResponse.json({ version: { ...newVersion, renderedContent } });
    }

    return NextResponse.json({ version: newVersion });
  } catch (error) {
    console.error('Failed to create version:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack, hasDatabaseUrl: !!process.env.DATABASE_URL });
    return NextResponse.json({ 
      error: 'Failed to create version',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

