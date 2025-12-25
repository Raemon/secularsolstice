import { NextResponse, NextRequest } from 'next/server';
import { listVersionsForChangelog } from '@/lib/songsRepository';

export async function GET(request: NextRequest) {
  try {
    const songId = request.nextUrl.searchParams.get('songId') || undefined;
    const filename = request.nextUrl.searchParams.get('filename') || undefined;
    const username = request.nextUrl.searchParams.get('username') || undefined;
    const limitParam = request.nextUrl.searchParams.get('limit');
    const offsetParam = request.nextUrl.searchParams.get('offset');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;
    const versions = await listVersionsForChangelog({ songId, filename, username, limit, offset });
    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error fetching changelog:', error);
    return NextResponse.json({ error: 'Failed to fetch changelog' }, { status: 500 });
  }
}
