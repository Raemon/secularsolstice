import { NextResponse } from 'next/server';
import { archiveVersion } from '@/lib/songsRepository';

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const version = await archiveVersion(params.id);
    return NextResponse.json({ version });
  } catch (error) {
    console.error('Failed to archive version:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack, hasDatabaseUrl: !!process.env.DATABASE_URL });
    return NextResponse.json({
      error: 'Failed to archive version',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    }, { status: 500 });
  }
}

