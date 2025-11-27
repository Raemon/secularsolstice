import { NextResponse } from 'next/server';
import { createProgram, listPrograms } from '@/lib/programsRepository';

export async function GET() {
  try {
    const programs = await listPrograms();
    return NextResponse.json({ programs });
  } catch (error) {
    console.error('Failed to load programs:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack, hasDatabaseUrl: !!process.env.DATABASE_URL });
    return NextResponse.json({
      error: 'Failed to load programs',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawTitle = typeof body.title === 'string' ? body.title.trim() : '';
    if (!rawTitle) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    const program = await createProgram(rawTitle);
    return NextResponse.json({ program });
  } catch (error) {
    console.error('Failed to create program:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack, hasDatabaseUrl: !!process.env.DATABASE_URL });
    return NextResponse.json({
      error: 'Failed to create program',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    }, { status: 500 });
  }
}












