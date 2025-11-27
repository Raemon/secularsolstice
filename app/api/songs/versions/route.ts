import { NextResponse } from 'next/server';
import { createVersionWithLineage } from '@/lib/songsRepository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { songId, label, content, audioUrl, bpm, previousVersionId } = body;
    
    if (!songId || !label) {
      return NextResponse.json({ error: 'songId and label are required' }, { status: 400 });
    }

    const newVersion = await createVersionWithLineage({
      songId,
      label,
      content: content ?? null,
      audioUrl: audioUrl ?? null,
      bpm: bpm ?? null,
      previousVersionId: previousVersionId ?? null,
    });

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

