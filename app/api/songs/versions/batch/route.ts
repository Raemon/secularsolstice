import { NextResponse } from 'next/server';
import { getVersionsByIds, SongVersionRecord } from '@/lib/songsRepository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { versionIds } = body;
    
    if (!Array.isArray(versionIds)) {
      return NextResponse.json({ error: 'versionIds must be an array' }, { status: 400 });
    }
    
    const versions = await getVersionsByIds(versionIds);
    
    const versionsMap: Record<string, SongVersionRecord> = {};
    versions.forEach(version => {
      versionsMap[version.id] = version;
    });
    
    return NextResponse.json({ versions: versionsMap });
  } catch (error) {
    console.error('Failed to load versions batch:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: 'Failed to load versions',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

