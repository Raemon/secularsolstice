import { NextResponse } from 'next/server';
import { archiveProgram } from '@/lib/programsRepository';

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const program = await archiveProgram(id);
    return NextResponse.json({ program });
  } catch (error) {
    console.error('Failed to archive program:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const status = errorMessage.includes('not found') ? 404 : 500;
    return NextResponse.json({
      error: errorMessage.includes('not found') ? 'Program not found' : 'Failed to archive program',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    }, { status });
  }
}


