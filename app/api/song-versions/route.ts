import { NextResponse } from 'next/server';
import { listAllVersionsWithSongTitles } from '@/lib/songsRepository';

export async function GET() {
  try {
    const versions = await listAllVersionsWithSongTitles();
    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Failed to load song versions:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack, hasDatabaseUrl: !!process.env.DATABASE_URL });
    return NextResponse.json({
      error: 'Failed to load song versions',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    }, { status: 500 });
  }
}














