import { NextResponse } from 'next/server';
import { getVersionById, getPreviousVersionsChain } from '@/lib/songsRepository';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const version = await getVersionById(params.id);
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    
    const previousVersions = await getPreviousVersionsChain(params.id);
    return NextResponse.json({ version, previousVersions, songTitle: version.songTitle });
  } catch (error) {
    console.error('Failed to load version:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack, hasDatabaseUrl: !!process.env.DATABASE_URL });
    return NextResponse.json({ 
      error: 'Failed to load version',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

