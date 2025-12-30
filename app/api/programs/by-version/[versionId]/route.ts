import { NextRequest, NextResponse } from 'next/server';
import { getProgramsContainingVersion } from '@/lib/programsRepository';

export async function GET(request: NextRequest, context: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await context.params;
  try {
    const programs = await getProgramsContainingVersion(versionId);
    return NextResponse.json({ programs });
  } catch (error) {
    console.error('Failed to fetch programs for version:', error);
    return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 });
  }
}
