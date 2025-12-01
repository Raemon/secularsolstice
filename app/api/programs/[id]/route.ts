import { NextResponse } from 'next/server';
import { getProgramById, updateProgramElementIds } from '@/lib/programsRepository';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const program = await getProgramById(id);
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }
    return NextResponse.json({ program });
  } catch (error) {
    console.error('Failed to load program:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack, hasDatabaseUrl: !!process.env.DATABASE_URL });
    return NextResponse.json({
      error: 'Failed to load program',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const elementIds = Array.isArray(body.elementIds) ? body.elementIds : null;
    const programIds = Array.isArray(body.programIds) ? body.programIds : null;
    if (!elementIds || !programIds) {
      return NextResponse.json({ error: 'elementIds and programIds must be arrays' }, { status: 400 });
    }
    const program = await updateProgramElementIds(id, elementIds, programIds);
    return NextResponse.json({ program });
  } catch (error) {
    console.error('Failed to update program:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack, hasDatabaseUrl: !!process.env.DATABASE_URL });
    return NextResponse.json({
      error: 'Failed to update program',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    }, { status: 500 });
  }
}


