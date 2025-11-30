import { NextResponse } from 'next/server';
import { updateVersionRenderedContent } from '@/lib/songsRepository';
import type { RenderedContent } from '@/lib/songsRepository';

export async function PATCH(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const body = await _.json();
    const { renderedContent } = body as { renderedContent: RenderedContent };
    
    if (!renderedContent || typeof renderedContent !== 'object') {
      return NextResponse.json({ error: 'renderedContent is required and must be an object' }, { status: 400 });
    }
    
    const updatedVersion = await updateVersionRenderedContent(params.id, renderedContent);
    return NextResponse.json({ version: updatedVersion });
  } catch (error) {
    console.error('Failed to update rendered content:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: 'Failed to update rendered content',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}





