import { NextRequest, NextResponse } from 'next/server';
import { getProgramById } from '../../../../lib/programsRepository';

export async function GET(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const program = await getProgramById(id);
    if (!program) {
      return NextResponse.json({error: 'Program not found'}, {status: 404});
    }
    return NextResponse.json({program});
  } catch (error) {
    console.error('Failed to load program:', error);
    return NextResponse.json({error: 'Failed to load program'}, {status: 500});
  }
}
