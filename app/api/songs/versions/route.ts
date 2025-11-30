import { NextResponse } from 'next/server';
import { createVersionWithLineage, updateVersionRenderedContent, SongVersionRecord } from '@/lib/songsRepository';
import { detectFileType } from '@/lib/lyricsExtractor';
import { generateAllChordmarkRenderTypes } from '@/lib/chordmarkRenderer';

async function handleChordmarkRendering(version: SongVersionRecord, label: string, content: string | null): Promise<SongVersionRecord> {
  if (!content) return version;
  
  const fileType = detectFileType(label, content);
  if (fileType === 'chordmark') {
    try {
      const renderedContent = generateAllChordmarkRenderTypes(content);
      if (Object.keys(renderedContent).length > 0) {
        await updateVersionRenderedContent(version.id, renderedContent);
        // Refresh the version to get the updated rendered content
        return { ...version, renderedContent };
      }
    } catch (renderError) {
      // Log the error but don't fail the version creation
      console.error('Failed to generate rendered content:', renderError);
    }
  }
  return version;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { songId, label, content, audioUrl, bpm, previousVersionId, createdBy } = body;
    
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
      bpm: bpm ?? null,
      previousVersionId: previousVersionId ?? null,
      createdBy: createdBy.trim(),
    });

    // If this is a chordmark file, automatically generate rendered content
    const versionWithRendering = await handleChordmarkRendering(newVersion, label, content ?? null);

    return NextResponse.json({ version: versionWithRendering });
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

