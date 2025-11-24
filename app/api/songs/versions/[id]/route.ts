import { NextResponse } from 'next/server';
import { updateVersionContent } from '@/lib/songsRepository';

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { content } = body;
    
    if (content === undefined) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const updatedVersion = await updateVersionContent(context.params.id, content);
    return NextResponse.json({ version: updatedVersion });
  } catch (error) {
    console.error('Failed to update version:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update version' }, { status: 500 });
  }
}

