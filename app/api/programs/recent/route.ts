import { NextResponse } from 'next/server';
import sql from '@/lib/db';

type ProgramRow = {
  id: string;
  title: string;
  element_ids: string[] | null;
  program_ids: string[] | null;
  created_at: string;
  is_subprogram: boolean;
  created_by: string | null;
  archived: boolean;
  video_url: string | null;
  print_program_foreword: string | null;
  print_program_epitaph: string | null;
  locked: boolean;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const rows = await sql`
      select id, title, element_ids, program_ids, created_at, is_subprogram, created_by, archived, video_url, print_program_foreword, print_program_epitaph, locked
      from programs
      where archived = false and is_subprogram = false
      order by created_at desc
      limit ${limit}
    `;
    const programs = (rows as ProgramRow[]).map(row => ({
      id: row.id,
      title: row.title,
      elementIds: row.element_ids ?? [],
      programIds: row.program_ids ?? [],
      createdAt: row.created_at,
      isSubprogram: row.is_subprogram,
      createdBy: row.created_by,
      archived: row.archived,
      videoUrl: row.video_url,
      printProgramForeword: row.print_program_foreword,
      printProgramEpitaph: row.print_program_epitaph,
      locked: row.locked,
    }));
    return NextResponse.json({ programs });
  } catch (error) {
    console.error('Failed to load recent programs:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      error: 'Failed to load recent programs',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    }, { status: 500 });
  }
}
