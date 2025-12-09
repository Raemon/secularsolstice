import { NextResponse } from 'next/server';
import { listSongsWithAllVersions } from '@/lib/songsRepository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const songs = await listSongsWithAllVersions();
    return NextResponse.json({ songs });
  } catch (error) {
    console.error('Failed to export songs:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: 'Failed to export songs',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}

