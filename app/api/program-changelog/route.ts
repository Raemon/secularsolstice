import { NextResponse, NextRequest } from 'next/server';
import { listProgramVersionsForChangelog } from '@/lib/programsRepository';

export async function GET(request: NextRequest) {
  try {
    const programId = request.nextUrl.searchParams.get('programId') || undefined;
    const username = request.nextUrl.searchParams.get('username') || undefined;
    const limitParam = request.nextUrl.searchParams.get('limit');
    const offsetParam = request.nextUrl.searchParams.get('offset');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;
    const versions = await listProgramVersionsForChangelog({ programId, username, limit, offset });
    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error fetching program changelog:', error);
    return NextResponse.json({ error: 'Failed to fetch program changelog' }, { status: 500 });
  }
}

