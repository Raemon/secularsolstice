import { NextResponse } from 'next/server';
import { updateVersion, SongVersionRecord } from '@/lib/songsRepository';
import { detectFileType } from '@/lib/lyricsExtractor';
import { generateAllChordmarkRenderTypes } from '@/lib/chordmarkRenderer';
import { updateVersionRenderedContent } from '@/lib/songsRepository';

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
      // Log the error but don't fail the version update
      console.error('Failed to generate rendered content:', renderError);
    }
  }
  return version;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { label, content, audioUrl, bpm, previousVersionId, nextVersionId } = body;
    
    const updates: Parameters<typeof updateVersion>[1] = {};
    if (label !== undefined) updates.label = label;
    if (content !== undefined) updates.content = content;
    if (audioUrl !== undefined) updates.audioUrl = audioUrl;
    if (bpm !== undefined) updates.bpm = bpm;
    if (previousVersionId !== undefined) updates.previousVersionId = previousVersionId;
    if (nextVersionId !== undefined) updates.nextVersionId = nextVersionId;

    const updatedVersion = await updateVersion(id, updates);

    // If content or label changed and it's a chordmark file, regenerate rendered content
    if ((label !== undefined || content !== undefined)) {
      const currentLabel = label !== undefined ? label : updatedVersion.label;
      const currentContent = content !== undefined ? content : updatedVersion.content;
      const versionWithRendering = await handleChordmarkRendering(updatedVersion, currentLabel, currentContent);
      return NextResponse.json({ version: versionWithRendering });
    }

    return NextResponse.json({ version: updatedVersion });
  } catch (error) {
    console.error('Failed to update version:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: 'Failed to update version',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
