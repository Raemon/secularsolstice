import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { latestProgramVersionCte } from '@/lib/programsRepository';

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
      with latest_versions as (${latestProgramVersionCte()})
      select p.id, lv.title, lv.element_ids, lv.program_ids, lv.created_at, lv.is_subprogram, lv.created_by, lv.archived, lv.video_url, lv.print_program_foreword, lv.print_program_epitaph, lv.locked
      from programs p
      join latest_versions lv on lv.program_id = p.id
      where lv.archived = false and lv.is_subprogram = false
      order by lv.created_at desc
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
